import { clearByokKey, getByokKey } from '@/lib/try/byok-client'

/**
 * Names of the window events the /try shell listens for. The dashboard has no
 * listener, so dispatching them there is a no-op — which is why the hooks can
 * fire them unconditionally instead of asking where they are mounted.
 */
export const OUT_OF_CREDITS_EVENT = 'mason:out-of-credits'
export const DESIGN_GENERATED_EVENT = 'mason:design-generated'

/** What rides on `mason:design-generated`. */
export type DesignGeneratedDetail = {
  designId: string
  frameId: string
  /** The rasterised sketch the model was shown, kept so Explore can show it too. */
  sketch: Blob
}

/**
 * `fetch` for anything under `/api/generate`.
 *
 * The one place the visitor's own Anthropic key leaves the browser: when one
 * is stored it goes on as `x-api-key`, and the route uses it for that request
 * alone, direct to Anthropic. Every generation call site goes through here so
 * a key pasted once applies to all of them — the frame, a revision, the
 * mobile version, the flow — rather than to whichever hook remembered to send
 * it. Without a stored key this is exactly `fetch`.
 */
export const generateFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const key = getByokKey()
  if (!key) return fetch(input, init)

  const headers = new Headers(init?.headers)
  headers.set('x-api-key', key)
  return fetch(input, { ...init, headers })
}

/**
 * Turns a refused generation into what the page should do about it.
 *
 * Returns the message to show when the refusal has a better explanation than
 * the route's body, else null so the caller keeps its own. Two statuses carry
 * side effects: 402 tells the /try shell to open its out-of-credits sheet,
 * and a 401 while a key is stored means Anthropic rejected that key, so it is
 * forgotten on the spot — resending a bad key on every click would only
 * repeat the same failure.
 */
export const noteGenerateRefusal = (response: Response): string | null => {
  if (response.status === 402) {
    window.dispatchEvent(new CustomEvent(OUT_OF_CREDITS_EVENT))
    return null
  }
  if (response.status === 401 && getByokKey()) {
    clearByokKey()
    return 'Your Anthropic key was rejected'
  }
  return null
}
