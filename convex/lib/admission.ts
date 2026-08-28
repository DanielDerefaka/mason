/**
 * Verifies the admission token the Next side mints for a guest sign-in.
 *
 * Why a token at all: the anonymous provider creates a real user on every
 * call, and the Convex action that does it is reachable by anyone with the
 * deployment URL. The Next route can see the caller's IP; Convex cannot. So
 * Next signs `{ ipHash, exp }` and Convex checks the signature before it
 * creates anything — which is what lets `guest.admitIp` throttle by network
 * without Convex ever seeing an address.
 *
 * The scheme is shared with `src/lib/try/admission.ts` and must stay
 * byte-compatible with it:
 *
 *   token   = base64url(JSON payload) + '.' + base64url(HMAC-SHA256(payloadB64, secret))
 *   payload = { ipHash: string, exp: number }   (exp in epoch milliseconds)
 *
 * base64url without padding; the MAC is over the UTF-8 bytes of the
 * base64url payload *string*, not of the JSON. A copy rather than an import
 * because this file runs in the Convex runtime and the other runs in Node and
 * on the edge; neither can reach the other's module graph.
 */

export type Admission = { ipHash: string; exp: number }

const encoder = new TextEncoder()

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const VALUES = new Map(Array.from(ALPHABET, (char, index) => [char, index] as const))

/**
 * Hand-rolled rather than `atob` so a stray padding or a character outside
 * the URL alphabet is a rejection, not a lenient decode of something else.
 */
const decodeBase64Url = (text: string): Uint8Array<ArrayBuffer> | null => {
  if (text.length === 0 || text.length % 4 === 1) return null
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const char of text) {
    const value = VALUES.get(char)
    if (value === undefined) return null
    buffer = (buffer << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  // Leftover bits are the encoder's padding and must be zero, otherwise two
  // different strings would decode to the same bytes.
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) return null
  return new Uint8Array(bytes)
}

const hmacKey = (secret: string) =>
  crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

const isAdmission = (value: unknown): value is Admission =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Admission).ipHash === 'string' &&
  (value as Admission).ipHash.length > 0 &&
  typeof (value as Admission).exp === 'number' &&
  Number.isFinite((value as Admission).exp)

/**
 * The payload when the token is genuine and current; null for anything else.
 *
 * Every failure is the same null — a caller that could tell "bad signature"
 * from "expired" from "garbage" could also tell an attacker which part of a
 * forgery to fix.
 */
export const verifyAdmission = async (
  token: string,
  secret: string,
  now: number = Date.now(),
): Promise<Admission | null> => {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [payloadB64, signatureB64] = parts

    const signature = decodeBase64Url(signatureB64)
    if (signature === null || signature.byteLength !== 32) return null

    // The signature is checked before the payload is even looked at, so an
    // unsigned payload never reaches the JSON parser.
    const genuine = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      signature,
      encoder.encode(payloadB64),
    )
    if (!genuine) return null

    const payloadBytes = decodeBase64Url(payloadB64)
    if (payloadBytes === null) return null
    const payload: unknown = JSON.parse(new TextDecoder().decode(payloadBytes))
    if (!isAdmission(payload)) return null
    if (payload.exp <= now) return null

    return { ipHash: payload.ipHash, exp: payload.exp }
  } catch {
    return null
  }
}
