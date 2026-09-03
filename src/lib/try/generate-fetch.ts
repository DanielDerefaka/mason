import { toast } from 'sonner'

import { track } from '@/lib/analytics'
import { clearByokKey, getByokKey, getByokWorkspace } from '@/lib/try/byok-client'

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
  // Only meaningful alongside a key, and only present for the keys that need
  // it — an identity-linked key is refused outright without one.
  const workspace = getByokWorkspace()
  if (workspace) headers.set('x-anthropic-workspace-id', workspace)
  return fetch(input, { ...init, headers })
}

/** What the page should do about a refused generation. */
export type GenerateRefusal = {
  /** The sentence to show, or null when the route's own body says it better. */
  message: string | null
  /** A second line under it, when the first needs one. */
  description?: string
  /** Seconds until the route will take the request again, from a 429's Retry-After. */
  retryAfter?: number
  /**
   * True when the /try shell has been told to open its out-of-credits sheet
   * for this refusal. A toast on top of it said the same thing twice: the
   * sheet is the answer to a 402, so the caller shows nothing more.
   */
  sheetOpened: boolean
}

/**
 * Reads a Retry-After header as a whole number of seconds, or null when it is
 * absent or a date. The routes write seconds; nothing here parses a date
 * because nothing here sends one.
 */
export const retryAfterSeconds = (header: string | null): number | null => {
  if (!header) return null
  const seconds = Number(header.trim())
  return Number.isInteger(seconds) && seconds > 0 ? seconds : null
}

/**
 * Turns a refused generation into what the page should do about it.
 *
 * The message is set when the refusal has a better explanation than the
 * route's body, else null so the caller keeps its own. Two statuses carry
 * side effects: 402 tells the /try shell to open its out-of-credits sheet,
 * and a 401 while a key is stored means Anthropic rejected that key, so it is
 * forgotten on the spot — resending a bad key on every click would only
 * repeat the same failure. A 429 with a Retry-After on it becomes a wait the
 * caller can count down, rather than a sentence that is stale a second later.
 */
export const noteGenerateRefusal = (response: Response): GenerateRefusal => {
  if (response.status === 402) {
    // Counted here rather than in the sheet, which has no idea why it opened.
    // Only /try listens, so only there is a 402 the sheet; the dashboard turns
    // the same status into a toast, which is not this event.
    const onTry = window.location.pathname.startsWith('/try')
    if (onTry) track('pool_exhausted_shown')
    window.dispatchEvent(new CustomEvent(OUT_OF_CREDITS_EVENT))
    return { message: null, sheetOpened: onTry }
  }
  if (response.status === 401 && getByokKey()) {
    clearByokKey()
    return { message: 'Your Anthropic key was rejected', sheetOpened: false }
  }
  if (response.status === 429) {
    const seconds = retryAfterSeconds(response.headers.get('Retry-After'))
    if (seconds) {
      return {
        message: 'Too many requests',
        description: `Try again in ${seconds}s`,
        retryAfter: seconds,
        sheetOpened: false,
      }
    }
  }
  return { message: null, sheetOpened: false }
}

/**
 * A 429 that counts down. The route's Retry-After is a number of seconds that
 * is wrong a second after it is read, so the toast is re-issued under the same
 * id once a second and dismissed when the wait is over.
 *
 * It lives beside the refusal it reads rather than in one of the two callers.
 * The canvas and the editor both ask the same routes and are both told to wait
 * by the same limiter, so a countdown in only one of them is a wait explained
 * in one place and a bare "Too many requests" in the other.
 */
export const toastRetryCountdown = (title: string, seconds: number) => {
  let left = seconds
  const id = toast.error(title, { description: `Try again in ${left}s`, duration: left * 1000 })
  const tick = setInterval(() => {
    left -= 1
    if (left <= 0) {
      clearInterval(tick)
      toast.dismiss(id)
      return
    }
    toast.error(title, { id, description: `Try again in ${left}s`, duration: left * 1000 })
  }, 1000)
}
