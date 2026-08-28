import type { FunctionReturnType } from 'convex/server'

import type { api } from '../../../convex/_generated/api'

/** What `api.guest.me` says about the signed-in visitor, once there is one. */
export type GuestMe = NonNullable<FunctionReturnType<typeof api.guest.me>>

/**
 * The guest behind `api.guest.me`, or null when the visitor has an account.
 *
 * The regression this exists for: the test used to be `'bonus' in me`, and
 * `bonus` is in every answer. `me` does not return null for a real user, it
 * returns a zero-filled shape with the same keys — so a signed-in user on
 * /try was read as a guest, shown "0 credits", and lost the link back to
 * their dashboard. `isGuest` is the only field that separates the two.
 */
export const asGuest = (me: GuestMe | null | undefined) => (me?.isGuest ? me : null)

/** True once we know the visitor is signed in and is not a guest. */
export const isAccount = (me: GuestMe | null | undefined) => Boolean(me) && !me?.isGuest
