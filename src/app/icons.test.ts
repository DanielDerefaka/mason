import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

/**
 * The raster icons are the SVG, at the sizes that get picked.
 *
 * The regression this exists for: the mark went into `app/icon.svg` and
 * `app/favicon.ico` stayed create-next-app's — a white triangle in a black
 * circle. Next serves both, Google's favicon picker takes the .ico, and the
 * brand results wore the starter's icon for three weeks. A .ico is not a file
 * anyone opens, so nothing noticed until a search did.
 *
 * `npm run icons` derives favicon.ico and apple-icon.png from the SVG. This
 * renders the SVG again, independently, and compares pixels, so the files are
 * held to the artwork rather than to each other.
 */
const APP = join(process.cwd(), 'src/app')
const SVG = readFileSync(join(APP, 'icon.svg'), 'utf8')
const ICO = readFileSync(join(APP, 'favicon.ico'))
const APPLE = readFileSync(join(APP, 'apple-icon.png'))

const render = (size: number, svg = SVG) =>
  sharp(Buffer.from(svg)).resize(size, size, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer()

/** Every image in a .ico as top-down RGBA, keyed by its pixel size. */
const icoLayers = (ico: Buffer) => {
  const layers = new Map<number, { rgba: Buffer; bitDepth: number }>()
  for (let index = 0; index < ico.readUInt16LE(4); index++) {
    const entry = 6 + 16 * index
    const size = ico[entry] || 256
    const bitDepth = ico.readUInt16LE(entry + 6)
    const offset = ico.readUInt32LE(entry + 12)
    // A 32-bit BMP: the 40-byte header, then BGRA rows bottom-up.
    const pixels = ico.subarray(offset + 40, offset + 40 + size * size * 4)
    const rgba = Buffer.alloc(size * size * 4)
    for (let row = 0; row < size; row++) {
      for (let x = 0; x < size; x++) {
        const i = ((size - 1 - row) * size + x) * 4
        const o = (row * size + x) * 4
        rgba[o] = pixels[i + 2]
        rgba[o + 1] = pixels[i + 1]
        rgba[o + 2] = pixels[i]
        rgba[o + 3] = pixels[i + 3]
      }
    }
    layers.set(size, { rgba, bitDepth })
  }
  return layers
}

/**
 * Mean distance per channel, 0–255, with colour weighted by alpha so that the
 * colour of a fully transparent pixel does not count.
 */
const distance = (a: Buffer, b: Buffer) => {
  let total = 0
  for (let i = 0; i < a.length; i += 4) {
    const alphaA = a[i + 3] / 255
    const alphaB = b[i + 3] / 255
    for (let channel = 0; channel < 3; channel++) {
      total += Math.abs(a[i + channel] * alphaA - b[i + channel] * alphaB)
    }
    total += Math.abs(a[i + 3] - b[i + 3])
  }
  return total / a.length
}

/** Close enough to be the same rendering; a different drawing is far past it. */
const SAME = 8

describe('favicon.ico', () => {
  const layers = icoLayers(ICO)

  it('carries 16, 32 and 48 — Google wants a layer of at least 48', () => {
    expect([...layers.keys()].sort((a, b) => a - b)).toEqual([16, 32, 48])
    for (const { bitDepth } of layers.values()) expect(bitDepth).toBe(32)
  })

  /**
   * The regression this exists for: the layers were written smallest first,
   * and Next's production build reports an .ico at the size of its *first*
   * directory entry — `getImageSize` in next-metadata-image-loader; turbopack
   * in development reports the largest, which is why the dev server hid it —
   * so the link tag said sizes="16x16" with a 48 in the file. The Map is in
   * directory order.
   */
  it('lists the 48 first, which is the size Next advertises the file at', () => {
    expect([...layers.keys()][0]).toBe(48)
  })

  it.each([16, 32, 48])('is icon.svg at %i, not the starter triangle', async (size) => {
    const svg = await render(size)
    expect(distance(svg, layers.get(size)!.rgba)).toBeLessThan(SAME)
    // The tolerance has to be one that nothing else would pass: an empty
    // layer must be far away, or the comparison above measured nothing.
    expect(distance(svg, Buffer.alloc(svg.length))).toBeGreaterThan(SAME * 5)
  })
})

describe('apple-icon.png', () => {
  it('is 180 square and opaque to the corners — iOS masks it and paints black under transparency', async () => {
    const { width, height, format } = await sharp(APPLE).metadata()
    expect([width, height, format]).toEqual([180, 180, 'png'])
    const rgba = await sharp(APPLE).ensureAlpha().raw().toBuffer()
    expect(rgba[3]).toBe(255)
  })

  it('is icon.svg squared off, not a different drawing', async () => {
    const square = SVG.replace(/ rx="\d+"/, '')
    expect(square).not.toBe(SVG)
    const svg = await render(180, square)
    const png = await sharp(APPLE).ensureAlpha().raw().toBuffer()
    expect(distance(svg, png)).toBeLessThan(SAME)
  })
})
