/**
 * The community pool's clock.
 *
 * Everything about the pool is keyed by a UTC day rather than a rolling
 * 24-hour window, because a window needs the time of every draw to be
 * remembered and a day needs one string. "Resets at midnight UTC" is also
 * something a banner can say and a person can plan around; "resets 24 hours
 * after the first person used it" is not.
 *
 * Pure and dependency-free on purpose: the Convex functions import this file
 * from outside their own directory, and the browser uses it for the countdown,
 * so it must not reach for anything either side lacks.
 */

/** The UTC calendar day `now` falls in, as `YYYY-MM-DD`. */
export const dayKey = (now: number = Date.now()): string => new Date(now).toISOString().slice(0, 10)

/** Epoch milliseconds of the next UTC midnight after `now`. */
export const nextResetAt = (now: number = Date.now()): number => {
  const date = new Date(now)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
}
