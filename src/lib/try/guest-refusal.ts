/**
 * Why a guest sign-in was refused, in a form that survives the wire.
 *
 * Convex masks a thrown `Error` as "[Request ID: …] Server Error" before the
 * browser sees it — deliberately, so an internal failure cannot leak its
 * message to a stranger. That is right for a fault and wrong for a rule: a
 * visitor who reaches the per-network daily cap was refused on purpose, and
 * the screen they got told them Mason was busy and to refresh in a minute. It
 * is not busy, and refreshing cannot help before midnight UTC.
 *
 * A `ConvexError` carries its `data` across unmasked, so the cap throws one of
 * these codes and the client can tell a rule from a fault. Codes rather than
 * sentences: the wording belongs to the screen that renders it, and a string
 * thrown across a network boundary is an API.
 *
 * Pure and dependency-free, like `pool-day.ts` beside it — `convex/guest.ts`
 * imports this from outside its own directory, so it must not reach for
 * anything either runtime lacks. The check below is a duck test for the same
 * reason.
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
 * Classifies whatever `signIn` threw.
 *
 * Duck-typed on `data` rather than `instanceof ConvexError`: the error is
 * rebuilt on the client from a serialised payload, and one import of
 * `convex/values` here would be a dependency in the file whose comment above
 * promises there are none.
 */
export const refusalFrom = (error: unknown): GuestRefusal => {
  const data =
    typeof error === 'object' && error !== null ? (error as { data?: unknown }).data : undefined
  return data === GUEST_IP_CAP ? 'network-cap' : 'unknown'
}
