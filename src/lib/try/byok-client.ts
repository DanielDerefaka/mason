/**
 * The visitor's own Anthropic key, in the browser only.
 *
 * It lives in `sessionStorage` rather than `localStorage` on purpose: a key
 * pasted into a shared machine should be gone when the tab closes, and nothing
 * on our side ever holds it longer than the one request it is sent on. The
 * only reader is `generateFetch`, which puts it on `/api/generate/*` as
 * `x-api-key` — the header the server reads, and the one Sentry scrubs by name.
 */
const STORAGE_KEY = 'mason-byok'

/**
 * The workspace the key acts in, for the keys that need one.
 *
 * Anthropic's identity-linked keys refuse every request that does not name a
 * workspace, and nothing in the key itself says whether it is one of those —
 * so this is optional, stored beside the key, and sent only when present.
 * Kept in the same session storage for the same reason: it is not a secret,
 * but it is meaningless without the key it belongs to.
 */
const WORKSPACE_STORAGE_KEY = 'mason-byok-workspace'

/**
 * The same shape the server insists on (`src/lib/byok.ts`), so a key that
 * would be refused there is refused at the paste box instead of after a
 * generation has been attempted.
 */
const KEY_SHAPE = /^sk-ant-[A-Za-z0-9_-]{20,}$/

/**
 * Fired whenever the stored key changes, by whichever code changed it.
 *
 * The header shows a "Key added" pill, and it used to be set once on mount
 * and then only by the key dialog — so when a 401 from Anthropic made
 * `noteGenerateRefusal` throw the key away mid-generation, the pill went on
 * claiming a key that was no longer there, and the next click quietly ran on
 * the house credits instead. Announcing the change from the one place that
 * performs it means every reader hears about every path, including that one.
 */
export const BYOK_CHANGED_EVENT = 'mason:byok-changed'

const announce = () => {
  try {
    window.dispatchEvent(new Event(BYOK_CHANGED_EVENT))
  } catch {
    // Server-side, or a window that has gone away mid-navigation.
  }
}

export const looksLikeAnthropicKey = (value: string): boolean => KEY_SHAPE.test(value.trim())

/**
 * Storage access is wrapped everywhere because it throws rather than returns
 * nothing in a few real situations — a private window in some browsers, a
 * page with site data blocked, or rendering on the server where `window`
 * does not exist. None of those should take the canvas down.
 */
const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export const getByokKey = (): string | null => {
  try {
    return storage()?.getItem(STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

export const getByokWorkspace = (): string | null => {
  try {
    return storage()?.getItem(WORKSPACE_STORAGE_KEY) || null
  } catch {
    return null
  }
}

/** The same shape `src/lib/byok.ts` accepts, so a typo is caught at the box. */
export const looksLikeWorkspaceId = (value: string): boolean =>
  /^[A-Za-z0-9_-]{6,100}$/.test(value.trim())

/**
 * Stored together, and cleared together.
 *
 * A workspace id left behind by a previous key would be sent alongside the
 * next one, and a key that belongs to a different account is refused for a
 * reason nobody could guess from the message. So there is one writer for both
 * and an empty workspace removes the stored one rather than storing "".
 */
export const setByokKey = (key: string, workspace?: string): void => {
  try {
    const store = storage()
    store?.setItem(STORAGE_KEY, key.trim())
    const id = workspace?.trim() ?? ''
    if (id) store?.setItem(WORKSPACE_STORAGE_KEY, id)
    else store?.removeItem(WORKSPACE_STORAGE_KEY)
  } catch {
    // Nothing to do: the key simply is not remembered for the next request.
  }
  // Announced even when the write threw: listeners re-read the storage rather
  // than trust the event, so a failed write correctly shows no key.
  announce()
}

export const clearByokKey = (): void => {
  try {
    storage()?.removeItem(STORAGE_KEY)
    storage()?.removeItem(WORKSPACE_STORAGE_KEY)
  } catch {
    // Same as above — a storage that cannot be written cannot hold a key.
  }
  announce()
}
