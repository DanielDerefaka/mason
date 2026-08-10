import sharp from 'sharp'

/**
 * The longest edge worth sending.
 *
 * Anthropic downsamples anything larger before it ever reaches the model, so
 * pixels beyond this are paid for in latency and discarded.
 */
const MAX_EDGE = 1568

/**
 * The ceiling is on the *base64* payload, which is about a third larger than
 * the bytes. Budgeting against the raw size keeps the encoded form inside it.
 */
const MAX_BYTES = 3_500_000

export type ImagePart = { type: 'file'; mediaType: string; data: Uint8Array }

export type FetchImageFailure = {
  url: string
  reason: 'unreachable' | 'not-an-image' | 'empty' | 'undecodable'
}

export type FetchImageResult = { parts: ImagePart[]; failures: FetchImageFailure[] }

/**
 * Downloads images and returns them as `file` parts.
 *
 * Handing the model a URL and letting it fetch is not portable: some models
 * behind a gateway want the bytes inline and reject a bare URL. Fetching here
 * means the same code path works whichever model is configured, and it carries
 * an explicit mediaType.
 *
 * Oversized images are re-encoded rather than dropped. A mood board photo out
 * of a phone or a design export is routinely larger than the request ceiling,
 * and skipping it meant a board that looked perfectly fine in the browser
 * produced "none of these could be read" — the picture was there, it was just
 * too big to post. Shrinking is what the model does to it anyway.
 */
const prepare = async (buffer: ArrayBuffer): Promise<ImagePart | null> => {
  const bytes = Buffer.from(buffer)

  try {
    const image = sharp(bytes, { failOn: 'none' })
    const meta = await image.metadata()
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0)

    const oversized = longest > MAX_EDGE || bytes.byteLength > MAX_BYTES
    if (!oversized) {
      const mediaType = meta.format ? `image/${meta.format === 'jpg' ? 'jpeg' : meta.format}` : ''
      if (mediaType.startsWith('image/')) {
        return { type: 'file', mediaType, data: new Uint8Array(bytes) }
      }
    }

    // JPEG rather than the original format: a screenshot re-encoded as PNG can
    // come out larger than it went in, which defeats the point.
    const resized = await image
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer()

    return { type: 'file', mediaType: 'image/jpeg', data: new Uint8Array(resized) }
  } catch {
    return null
  }
}

export const fetchImageParts = async (urls: string[]): Promise<ImagePart[]> =>
  (await fetchImages(urls)).parts

/** The same fetch, with the reasons anything was dropped. */
export const fetchImages = async (urls: string[]): Promise<FetchImageResult> => {
  const results = await Promise.all(
    urls.map(async (url): Promise<ImagePart | FetchImageFailure> => {
      let response: Response
      try {
        response = await fetch(url)
      } catch {
        return { url, reason: 'unreachable' }
      }
      if (!response.ok) return { url, reason: 'unreachable' }

      const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
      // Convex serves uploads with the type they arrived with, which is
      // occasionally octet-stream; sharp decides from the bytes instead.
      if (mediaType && !mediaType.startsWith('image/') && mediaType !== 'application/octet-stream') {
        return { url, reason: 'not-an-image' }
      }

      const buffer = await response.arrayBuffer()
      if (buffer.byteLength === 0) return { url, reason: 'empty' }

      const part = await prepare(buffer)
      return part ?? { url, reason: 'undecodable' }
    }),
  )

  return {
    parts: results.filter((r): r is ImagePart => 'type' in r),
    failures: results.filter((r): r is FetchImageFailure => 'reason' in r),
  }
}
