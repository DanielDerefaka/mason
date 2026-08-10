import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { findPhoto, pexelsConfigured } from './pexels'

/**
 * The stock lookup behind every photograph in a generated design.
 *
 * Tested against a stubbed API rather than the real one: the free tier is 200
 * requests an hour, and a test suite that spends them is a test suite nobody
 * runs. What matters here is not that Pexels works — it is that the pool is
 * cached, that consecutive slots get different pictures, that the crop matches
 * the slot, and that every failure ends in a design with a grey panel rather
 * than a design with a hole.
 */
const photo = (id: number) => ({
  src: { original: `https://images.pexels.com/photos/${id}/photo.jpeg` },
  photographer: `Photographer ${id}`,
  photographer_url: `https://www.pexels.com/@p${id}`,
  alt: 'a description',
})

const respond = (photos: unknown[]) =>
  new Response(JSON.stringify({ photos }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

let calls: URL[]

const stub = (handler: () => Response | Promise<Response>) => {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      calls.push(new URL(String(input)))
      return handler()
    }),
  )
}

beforeEach(() => {
  vi.stubEnv('PEXELS_API_KEY', 'test-key')
  // The module caches across calls by design, so each test needs a clean one.
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('configuration', () => {
  it('reports whether a key is set, which is what decides the fallback', () => {
    expect(pexelsConfigured()).toBe(true)
    vi.stubEnv('PEXELS_API_KEY', '')
    expect(pexelsConfigured()).toBe(false)
  })

  it('returns nothing without a key rather than calling out unauthenticated', async () => {
    vi.stubEnv('PEXELS_API_KEY', '')
    stub(() => respond([photo(1)]))

    expect(await findPhoto('coffee shop', 800, 600, 0)).toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('never puts the key in the URL', async () => {
    stub(() => respond([photo(1)]))
    await findPhoto('coffee shop', 800, 600, 0)

    expect(calls[0].toString()).not.toContain('test-key')
  })
})

describe('the query', () => {
  it('turns the model comma convention into a phrase Pexels can read', async () => {
    stub(() => respond([photo(1)]))
    await findPhoto('coffee,shop,interior', 800, 600, 0)

    expect(calls[0].searchParams.get('query')).toBe('coffee shop interior')
  })

  it('asks for the orientation the slot actually is', async () => {
    stub(() => respond([photo(1)]))

    await findPhoto('office', 1600, 600, 0)
    expect(calls[0].searchParams.get('orientation')).toBe('landscape')

    await findPhoto('portrait', 600, 1600, 0)
    expect(calls[1].searchParams.get('orientation')).toBe('portrait')

    await findPhoto('logo', 800, 800, 0)
    expect(calls[2].searchParams.get('orientation')).toBe('square')
  })

  it('widens a phrase that returned nothing rather than giving up', async () => {
    let first = true
    stub(() => {
      const empty = first
      first = false
      return respond(empty ? [] : [photo(9)])
    })

    const result = await findPhoto('brushed anodised aluminium panel', 800, 600, 0)

    expect(result).not.toBeNull()
    expect(calls[1].searchParams.get('query')).toBe('brushed anodised')
  })

  it('gives up cleanly when even the broader query is empty', async () => {
    stub(() => respond([]))
    expect(await findPhoto('nothing matches this at all', 800, 600, 0)).toBeNull()
  })

  it('does not call out for an empty slot', async () => {
    stub(() => respond([photo(1)]))
    expect(await findPhoto('   ', 800, 600, 0)).toBeNull()
    expect(calls).toHaveLength(0)
  })
})

describe('the pool', () => {
  it('gives consecutive slots different photographs', async () => {
    // Three cards in a row asking for the same subject must not be the same
    // picture three times.
    stub(() => respond([photo(1), photo(2), photo(3)]))

    const results = await Promise.all(
      [0, 1, 2].map((index) => findPhoto('team meeting', 600, 400, index)),
    )

    expect(new Set(results.map((result) => result?.url))).toHaveProperty('size', 3)
  })

  it('wraps rather than failing when a page asks for more slots than the pool holds', async () => {
    stub(() => respond([photo(1), photo(2)]))

    expect(await findPhoto('team', 600, 400, 5)).not.toBeNull()
  })

  it('spends one request for a repeated query, since the free tier is small', async () => {
    stub(() => respond([photo(1), photo(2)]))

    await findPhoto('city skyline', 600, 400, 0)
    await findPhoto('city skyline', 600, 400, 1)
    await findPhoto('city,skyline', 600, 400, 2)

    expect(calls).toHaveLength(1)
  })

  it('does not serve a landscape photo from the cache to a portrait slot', async () => {
    stub(() => respond([photo(1)]))

    await findPhoto('mountain', 1600, 600, 0)
    await findPhoto('mountain', 600, 1600, 0)

    expect(calls).toHaveLength(2)
  })
})

describe('the returned photograph', () => {
  it('is cropped by the CDN to the slot, not sent full size to the browser', async () => {
    stub(() => respond([photo(1)]))

    const result = await findPhoto('desk', 1200, 800, 0)
    const url = new URL(result?.url ?? '')

    expect(url.searchParams.get('w')).toBe('1200')
    expect(url.searchParams.get('h')).toBe('800')
    expect(url.searchParams.get('fit')).toBe('crop')
  })

  it('carries the photographer, which Pexels requires be credited', async () => {
    stub(() => respond([photo(7)]))

    // A query no other test uses: the cache is module-level and shared on
    // purpose, so a repeated phrase here would be served the earlier pool.
    const result = await findPhoto('studio lighting rig', 800, 600, 0)

    expect(result?.photographer).toBe('Photographer 7')
    expect(result?.photographerUrl).toContain('pexels.com')
  })
})

describe('failure', () => {
  it.each([
    ['a rate-limited API', () => new Response('', { status: 429 })],
    ['a server error', () => new Response('', { status: 500 })],
  ])('returns nothing on %s, so the slot falls back', async (_label, handler) => {
    stub(handler)
    expect(await findPhoto('anything', 800, 600, 0)).toBeNull()
  })

  it('lets a network failure surface for the route to catch', async () => {
    stub(() => {
      throw new Error('ENOTFOUND')
    })
    await expect(findPhoto('anything', 800, 600, 0)).rejects.toThrow()
  })
})

describe('the hourly budget', () => {
  it('stops calling out once the free tier is nearly spent', async () => {
    // The route is public, so the quota is reachable by anyone. Past the
    // budget a slot falls back rather than every design in the product losing
    // its photographs until the hour turns over.
    stub(() => respond([photo(1)]))

    const results = []
    for (let index = 0; index < 200; index += 1) {
      results.push(await findPhoto(`budget subject ${index}`, 800, 600, 0))
    }

    expect(calls.length).toBeLessThanOrEqual(180)
    expect(results.filter(Boolean).length).toBeLessThanOrEqual(180)
    expect(results.filter(Boolean).length).toBeGreaterThan(0)
  })

  it('still serves a cached query after the budget is gone', async () => {
    // The pool is already in hand; refusing it would spend nothing and cost
    // the design its picture for no reason.
    expect(await findPhoto('budget subject 0', 800, 600, 1)).not.toBeNull()
  })
})
