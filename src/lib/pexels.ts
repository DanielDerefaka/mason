/**
 * Photographs for generated designs.
 *
 * Every design used to point its <img> tags at loremflickr, which returns a
 * keyword-ish photograph of unpredictable quality — the cat statue that ate a
 * hero section came from there. Pexels returns curated stock, which raises the
 * ceiling on every design the product makes without changing a line of layout.
 *
 * The model never sees this file or the key. It writes the same shape of URL
 * it always did, pointed at our own route, and the resolving happens here on
 * the server. That keeps three things true at once: the key stays secret, the
 * markup streams to the client with no post-processing pass, and a design is
 * still a self-contained fragment of HTML.
 */
const ENDPOINT = 'https://api.pexels.com/v1/search'

/** Pexels' free tier is 200 requests an hour, so a repeat must not spend one. */
const TTL = 60 * 60 * 1000
const MAX_ENTRIES = 500

export type Photo = {
  url: string
  photographer: string
  photographerUrl: string
  alt: string
  /** 0 is black, 1 is white. Pexels reports the photo's average colour. */
  luminance: number
}

/** How light this tonality is, on the same 0..1 scale. */
export type Tone = 'light' | 'dark'

/**
 * Perceived brightness of Pexels' reported average colour.
 *
 * Keywords alone cannot control tonality: appending "white background studio"
 * shifts `green plant` from near-black to near-white, and does nothing at all
 * to `mossy log branch`, because the shift only happens when photographs like
 * that exist. Asking is therefore unreliable in exactly the cases that hurt —
 * a pale page with a dark photograph dropped into the middle of it. The
 * average colour comes back on every result, so the tonality can be measured
 * instead of requested.
 */
const luminanceOf = (hex: string | undefined): number => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!match) return 0.5
  const value = Number.parseInt(match[1], 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

type Entry = { photos: Photo[]; at: number }

const cache = new Map<string, Entry>()

const remember = (key: string, photos: Photo[]) => {
  // Oldest out first. A Map iterates in insertion order, so the first key is
  // the least recently added.
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { photos, at: Date.now() })
}

export const pexelsConfigured = () => Boolean(process.env.PEXELS_API_KEY)

/**
 * Which shape of photograph to ask for.
 *
 * Pexels crops to fit, so asking for a landscape photo to fill a portrait slot
 * throws away most of the subject. Matching the orientation to the slot is the
 * difference between a face and a chin.
 */
const orientationFor = (width: number, height: number) => {
  const ratio = width / height
  if (ratio > 1.2) return 'landscape'
  if (ratio < 0.83) return 'portrait'
  return 'square'
}

type PexelsResponse = {
  photos?: Array<{
    src?: { original?: string }
    photographer?: string
    photographer_url?: string
    alt?: string
    avg_color?: string
  }>
}

/**
 * The hourly budget, kept a little under the free tier's 200.
 *
 * The route that calls this is public — it has to be, because a shared design
 * is read by people with no account — so the quota is reachable by anyone who
 * wants to spend it. The cache absorbs repeats; this bounds the rest. Past the
 * budget the search returns nothing and the slot falls back to a grey panel,
 * which is the same outcome as the API being down and a better one than every
 * design in the product losing its photographs until the hour turns over.
 */
const BUDGET = 180
let spent = 0
let windowStart = 0

const withinBudget = () => {
  const now = Date.now()
  if (now - windowStart > TTL) {
    windowStart = now
    spent = 0
  }
  if (spent >= BUDGET) return false
  spent += 1
  return true
}

const search = async (query: string, orientation: string): Promise<Photo[]> => {
  const key = process.env.PEXELS_API_KEY
  if (!key) return []

  const cacheKey = `${query}|${orientation}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < TTL) return hit.photos

  if (!withinBudget()) return []

  const url = new URL(ENDPOINT)
  url.searchParams.set('query', query)
  url.searchParams.set('orientation', orientation)
  // A pool rather than one result: consecutive slots on a page ask for the
  // same subject and must not come back as the same picture.
  url.searchParams.set('per_page', '20')

  const response = await fetch(url, {
    headers: { Authorization: key },
    // The design is already streaming by the time these load; a slow stock
    // API must not hold an image request open indefinitely.
    signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) return []

  const body = (await response.json()) as PexelsResponse
  const photos = (body.photos ?? [])
    .map((photo) => ({
      url: photo.src?.original ?? '',
      photographer: photo.photographer ?? 'Unknown',
      photographerUrl: photo.photographer_url ?? 'https://www.pexels.com',
      alt: photo.alt ?? query,
      luminance: luminanceOf(photo.avg_color),
    }))
    .filter((photo) => photo.url)

  remember(cacheKey, photos)
  return photos
}

/**
 * The photograph for one slot.
 *
 * `index` is the model's per-image counter — the same thing loremflickr's
 * `lock` did. It picks a different photo out of the pool for each slot, so a
 * three-card row is three pictures rather than the same one three times.
 */
export const findPhoto = async (
  keywords: string,
  width: number,
  height: number,
  index: number,
  cutout = false,
  tone: Tone | null = null,
): Promise<Photo | null> => {
  // The model comma-separates to narrow, which is a loremflickr convention.
  // Pexels reads a natural phrase, so the commas become spaces.
  const base = keywords.replace(/[,+_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!base) return null

  /**
   * A slot asking for a subject that floats on the page rather than sitting in
   * a box. There is no such thing as a cut-out in a stock search — every
   * result is a rectangle — so the nearest available thing is a subject shot
   * against a plain white studio background, which composites away under
   * `mix-blend-mode: multiply` on a light page.
   *
   * It is an approximation and it fails on dark backgrounds, which is why the
   * prompt only reaches for it when the reference is light.
   */
  const query = cutout ? `${base} isolated white background studio` : base

  let photos = await search(query, orientationFor(width, height))

  // A narrow phrase can return nothing at all. Widening to the first two words
  // is better than a hole in the layout. For a cut-out that means dropping the
  // studio qualifiers first, since they are the part most likely to have
  // emptied the result.
  if (photos.length === 0 && cutout) {
    photos = await search(base, orientationFor(width, height))
  }
  if (photos.length === 0) {
    const broader = base.split(' ').slice(0, 2).join(' ')
    if (broader !== base) photos = await search(broader, orientationFor(width, height))
  }
  if (photos.length === 0) return null

  /**
   * Narrow the pool to the half that matches the tonality asked for, then index
   * within it. Half rather than one, because three cards in a row still have to
   * be three different pictures — a filter that returns the single lightest
   * photo would put the same one in every slot.
   *
   * A cut-out implies light: the whole trick is that a pale background drops
   * away under `multiply`, and a dark photograph has no background to lose.
   */
  const wanted = cutout ? 'light' : tone
  const pool =
    wanted && photos.length > 3
      ? [...photos]
          .sort((a, b) =>
            wanted === 'light' ? b.luminance - a.luminance : a.luminance - b.luminance,
          )
          .slice(0, Math.ceil(photos.length / 2))
      : photos

  const photo = pool[Math.abs(index) % pool.length]

  // Pexels resizes and crops on its own CDN, so the browser is never sent a
  // 6000px original to paint into a 400px card.
  const sized = new URL(photo.url)
  sized.searchParams.set('auto', 'compress')
  sized.searchParams.set('cs', 'tinysrgb')
  sized.searchParams.set('fit', 'crop')
  sized.searchParams.set('w', String(width))
  sized.searchParams.set('h', String(height))

  return { ...photo, url: sized.toString() }
}
