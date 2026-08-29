/**
 * Why a guest sign-in was refused, in a form that survives the wire.
 *
 * Convex masks a thrown `Error` as "[Request ID: …] Server Error" before
 * anyone outside sees it — deliberately, so an internal failure cannot narrate
 * itself to a stranger. That is right for a fault and wrong for a rule: a
 * visitor who reaches the per-network daily cap was refused on purpose, and
 * the screen they got told them Mason was busy and to refresh in a minute. It
 * is not busy, and no refresh can succeed before midnight UTC.
 *
 * A `ConvexError` carries `data` past that masking, so the cap throws one, and
 * `refusalFrom` reads it. Codes rather than sentences: the wording belongs to
 * the screen rendering it, and a string thrown across a boundary is an API.
 *
 * **That data does not reach the browser, and it cannot.** In the Next
 * integration `signIn` does not talk to Convex — it posts to /api/auth, which
 * `convexAuthNextjsMiddleware` proxies. The proxy catches the ConvexError and
 * forwards `{ error: error.message }` with a 400, dropping `data`; the client
 * then throws a plain `Error` built from that message, which is the masked
 * one. Both halves of the code are lost between the mutation and the screen,
 * and the first version of this file shipped believing otherwise: /try showed
 * a capped network the generic failure, because the classification it was
 * doing could only ever return `unknown`.
 *
 * So the refusal travels as an *absence* instead. `convex/auth.ts` catches the
 * cap here and returns `null` from `authorize`, which the library reports as a
 * perfectly ordinary sign-in that produced no tokens — 200 through the proxy,
 * nothing to redact — and `signIn` resolves with `{ signingIn: false }`.
 * `refusalFromSignIn` reads that. It is a narrow channel, and it works because
 * the cap is the only thing in this app that refuses a guest deliberately.
 *
 * Pure and dependency-free, like `pool-day.ts` beside it — `convex/guest.ts`
 * and `convex/auth.ts` both import this from outside their own directory, so
 * it must not reach for anything either runtime lacks. The check below is a
 * duck test for the same reason.
 */

/** The network has opened its allowance of new guest sessions for the UTC day. */
export const GUEST_IP_CAP = 'guest_ip_cap'

/**
 * What /try shows. `unknown` covers everything that is not a rule — a dropped
 * request, a missing secret, a real fault — and keeps the "try again" wording,
 * which is honest for all of them.
 */
export type GuestRefusal = 'network-cap' | 'unknown'

/**
 * Classifies a thrown error. Used inside Convex, where `data` is still intact
 * — never on the client, where the proxy has already flattened it.
 *
 * Duck-typed on `data` rather than `instanceof ConvexError`, because one
 * import of `convex/values` here would be a dependency in the file whose
 * comment above promises there are none.
 */
export const refusalFrom = (error: unknown): GuestRefusal => {
  const data =
    typeof error === 'object' && error !== null ? (error as { data?: unknown }).data : undefined
  return data === GUEST_IP_CAP ? 'network-cap' : 'unknown'
}

/**
 * Classifies what `signIn` resolved with, which is where the browser learns of
 * a refusal.
 *
 * A sign-in that returns no tokens is not an error and never was one — it is
 * `authorize` having declined, and the cap is the only thing that declines.
 * Anything genuinely broken throws instead, and is classified by the catch.
 */
export const refusalFromSignIn = (result: { signingIn?: boolean } | undefined): GuestRefusal | null =>
  result?.signingIn ? null : 'network-cap'
