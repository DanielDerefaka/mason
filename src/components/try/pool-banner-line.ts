import { formatCountdown } from './countdown'

/** What the banner knows when it picks its line. */
export type PoolBannerState = {
  remaining: number
  size: number
  /** Milliseconds until the pool comes back. */
  resetsIn: number
  /** The guest's own pool turn for today is taken. */
  guestSpent: boolean
  canClaimShare: boolean
  /** A design is on its way to this canvas right now, on the pool or a bonus. */
  inFlight: boolean
}

/**
 * The banner's one line.
 *
 * The pool turn is spent at the moment of the charge, which is the moment
 * of the click, and `guest.me` says so at once. The design lands most of a
 * minute later. In between, the banner read "You've used your free
 * generation today" over a canvas with nothing new on it, which is the
 * sentence you would write to tell someone their turn had gone for nothing.
 * While the design is on its way the line says that instead, and the spent
 * wording waits for something to have been got for it.
 *
 * Pure, so the wording has a test; the component feeds it the clock and the
 * store.
 */
export const poolBannerLine = (state: PoolBannerState): string => {
  if (state.guestSpent && state.inFlight) return 'Your free generation is on its way.'
  if (state.remaining <= 0) {
    return `The pool is used up and resets in ${formatCountdown(state.resetsIn)}. Add your own key to keep going.`
  }
  if (state.guestSpent) {
    return state.canClaimShare
      ? "You've used your free generation today. Share on X for 2 more, or add your key."
      : "You've used your free generation today. Add your key to keep going."
  }
  return `Community pool · ${state.remaining} of ${state.size} free generations left today`
}
