/**
 * Admission tokens for guest sign-in.
 *
 * A guest session is created by the Convex `anonymous` provider, and the
 * provider cannot see the request that asked for it — so it cannot throttle by
 * network on its own. The Next server can. It reads the caller's IP, hashes
 * it, and signs a short-lived token saying "this network may open a guest
 * session"; the client hands that token to `signIn('anonymous')`, and the
 * provider verifies it and counts the network.
 *
 * WebCrypto only, on purpose: this runs in Next (Node or edge) and is mirrored
 * verbatim in `convex/lib/admission.ts`, where Node's `crypto` module does not
 * exist. The two copies must produce identical bytes, which is why the scheme
 * is spelled out here rather than delegated to a library:
 *
 *   token   = base64url(utf8(JSON payload)) + '.' + base64url(hmac)
 *   hmac    = HMAC-SHA256(secret, utf8 bytes of the base64url payload string)
 *   payload = { ipHash, exp }
 *
 * No padding anywhere. The signature covers the encoded string, not the JSON,
 * so a verifier never has to re-serialise anything.
 */
export type Admission = {
  /** sha256(secret + ip), never the address itself. */
  ipHash: string
  /** Epoch milliseconds after which the token is refused. */
  exp: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const BASE64URL = /^[A-Za-z0-9_-]+$/

const fromBase64Url = (text: string): Uint8Array | null => {
  if (!BASE64URL.test(text)) return null
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
  try {
    const binary = atob(padded)
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])

const sign = async (payload: string, secret: string) => {
  const key = await hmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return new Uint8Array(signature)
}

/**
 * Compared byte by byte without an early exit. A `===` on two strings stops
 * at the first difference, and the time it takes says how many leading bytes
 * of a forged signature were right.
 */
const sameBytes = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i]
  return diff === 0
}

export const signAdmission = async (admission: Admission, secret: string): Promise<string> => {
  const payload = toBase64Url(encoder.encode(JSON.stringify(admission)))
  const signature = await sign(payload, secret)
  return `${payload}.${toBase64Url(signature)}`
}

/**
 * The payload when the token is genuine and still live; null for anything
 * else. Every failure is the same null on purpose — a caller that could tell
 * "bad signature" from "expired" could also tell how close a forgery got.
 */
export const verifyAdmission = async (
  token: string,
  secret: string,
  now = Date.now(),
): Promise<Admission | null> => {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts
  if (!payload || !signature) return null

  const given = fromBase64Url(signature)
  if (!given) return null
  const expected = await sign(payload, secret)
  if (!sameBytes(given, expected)) return null

  const bytes = fromBase64Url(payload)
  if (!bytes) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(decoder.decode(bytes))
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const { ipHash, exp } = parsed as Record<string, unknown>
  if (typeof ipHash !== 'string' || typeof exp !== 'number' || !Number.isFinite(exp)) return null
  if (exp <= now) return null

  return { ipHash, exp }
}

/**
 * The only form an address is ever kept in. Keyed with the secret so the
 * hash of a known address cannot be computed from outside, which is what
 * would otherwise let a table of hashes be turned back into a table of
 * visitors.
 */
export const hashIp = async (ip: string, secret: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret + ip))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
