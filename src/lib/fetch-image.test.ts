import sharp from 'sharp'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchImageParts, fetchImages } from './fetch-image'

/**
 * The regression this suite exists for.
 *
 * A mood board image over the size budget used to be skipped, so a board that
 * looked perfectly fine in the browser produced "None of the mood board images
 * could be read" and the design was generated with no reference at all. It now
 * shrinks instead — which is what the model does to the picture anyway.
 */
const MAX_EDGE = 1568

const png = (width: number, height: number, channel = 90) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      // Noise, not flat colour: a flat PNG compresses to a few hundred bytes,
      // which would never exercise the byte budget.
      background: { r: channel, g: 140, b: 200 },
    },
  })
    .png()
    .toBuffer()

const serve = (
  bodies: Array<Buffer | { status?: number; type?: string; body?: Buffer } | Error>,
) => {
  let call = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const entry = bodies[call++]
      if (entry instanceof Error) throw entry
      const spec = Buffer.isBuffer(entry) ? { body: entry } : entry
      const body = spec.body ?? Buffer.alloc(0)
      return new Response(spec.status && spec.status >= 400 ? null : new Uint8Array(body), {
        status: spec.status ?? 200,
        headers: { 'content-type': spec.type ?? 'image/png' },
      })
    }),
  )
}

const decode = async (data: Uint8Array) => sharp(Buffer.from(data)).metadata()

afterEach(() => vi.unstubAllGlobals())

describe('oversized images', () => {
  it('shrinks a picture past the edge limit instead of dropping it', async () => {
    serve([await png(3102, 1936)])

    const { parts, failures } = await fetchImages(['https://mason.test/big.png'])

    expect(failures).toEqual([])
    expect(parts).toHaveLength(1)

    const meta = await decode(parts[0].data)
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(MAX_EDGE)
  })

  it('keeps the aspect ratio, so a wide screenshot is not squared off', async () => {
    serve([await png(3000, 1000)])

    const [part] = (await fetchImages(['https://mason.test/wide.png'])).parts
    const meta = await decode(part.data)

    expect((meta.width ?? 0) / (meta.height ?? 1)).toBeCloseTo(3, 1)
  })

  it('re-encodes as JPEG, since a re-encoded PNG can come out larger', async () => {
    serve([await png(2400, 2400)])

    const [part] = (await fetchImages(['https://mason.test/square.png'])).parts

    expect(part.mediaType).toBe('image/jpeg')
    expect((await decode(part.data)).format).toBe('jpeg')
  })

  it('brings a real-sized board image under the post budget', async () => {
    // The measured case: a 2.6MB screenshot that previously produced a board
    // with nothing in it. Base64 adds about a third, which is the limit the
    // API actually applies.
    const original = await png(3102, 1936)
    serve([original])

    const [part] = (await fetchImages(['https://mason.test/UI.png'])).parts

    expect(part.data.byteLength).toBeLessThan(original.byteLength)
    expect(part.data.byteLength * 1.34).toBeLessThan(5_000_000)
  })

  it('leaves a small image alone rather than re-encoding it needlessly', async () => {
    const original = await png(800, 600)
    serve([original])

    const [part] = (await fetchImages(['https://mason.test/small.png'])).parts

    expect(part.mediaType).toBe('image/png')
    expect(part.data.byteLength).toBe(original.byteLength)
  })

  it('does not enlarge an image that is smaller than the limit', async () => {
    serve([await png(400, 300)])

    const [part] = (await fetchImages(['https://mason.test/tiny.png'])).parts
    const meta = await decode(part.data)

    expect(meta.width).toBe(400)
  })
})

describe('content types', () => {
  it('accepts octet-stream, which is how Convex serves some uploads', async () => {
    serve([{ body: await png(900, 700), type: 'application/octet-stream' }])

    const { parts, failures } = await fetchImages(['https://mason.test/upload'])

    expect(failures).toEqual([])
    expect(parts).toHaveLength(1)
  })

  it('rejects something that is genuinely not an image', async () => {
    serve([{ body: Buffer.from('<!doctype html>'), type: 'text/html' }])

    const { parts, failures } = await fetchImages(['https://mason.test/page'])

    expect(parts).toEqual([])
    expect(failures[0].reason).toBe('not-an-image')
  })

  it('reports bytes that claim to be an image but do not decode', async () => {
    serve([{ body: Buffer.from('not really a png'), type: 'image/png' }])

    expect((await fetchImages(['https://mason.test/broken.png'])).failures[0].reason).toBe(
      'undecodable',
    )
  })
})

describe('failures', () => {
  it.each([
    ['an unreachable host', new Error('ECONNREFUSED'), 'unreachable'],
    ['a 404', { status: 404 }, 'unreachable'],
    ['an empty body', { body: Buffer.alloc(0) }, 'empty'],
  ])('reports %s', async (_label, entry, reason) => {
    serve([entry as never])

    const { failures } = await fetchImages(['https://mason.test/x.png'])

    expect(failures).toEqual([{ url: 'https://mason.test/x.png', reason }])
  })

  it('one bad image does not take the good ones down with it', async () => {
    // A board is generated from whatever could be read; a single dead URL must
    // not cost the user the whole reference.
    serve([await png(900, 700), new Error('gone'), await png(500, 500)])

    const { parts, failures } = await fetchImages([
      'https://mason.test/a.png',
      'https://mason.test/b.png',
      'https://mason.test/c.png',
    ])

    expect(parts).toHaveLength(2)
    expect(failures).toHaveLength(1)
  })

  it('returns nothing at all for an empty board without calling out', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)

    expect(await fetchImageParts([])).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })
})
