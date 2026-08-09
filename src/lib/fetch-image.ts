/** Anthropic rejects anything much larger, and a huge reference is rarely worth the tokens. */
const MAX_BYTES = 5 * 1024 * 1024

export type ImagePart = { type: 'file'; mediaType: string; data: Uint8Array }

/**
 * Downloads images and returns them as `file` parts.
 *
 * Handing the model a URL and letting it fetch is not portable: some models
 * behind a gateway want the bytes inline and reject a bare URL with
 * "expected a base64-encoded data URL". Fetching here means the same code path
 * works whichever model is configured, and it also carries an explicit
 * mediaType — the deprecated `image` part sent none, which is what the upstream
 * complained about.
 *
 * A reference that cannot be fetched is skipped rather than fatal: losing one
 * of six inspiration images should not fail the whole generation.
 */
export const fetchImageParts = async (urls: string[]): Promise<ImagePart[]> => {
  const parts = await Promise.all(
    urls.map(async (url): Promise<ImagePart | null> => {
      try {
        const response = await fetch(url)
        if (!response.ok) return null

        const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
        if (!mediaType.startsWith('image/')) return null

        const buffer = await response.arrayBuffer()
        if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) return null

        return { type: 'file', mediaType, data: new Uint8Array(buffer) }
      } catch {
        return null
      }
    }),
  )

  return parts.filter((part): part is ImagePart => part !== null)
}
