import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

/**
 * Anonymous users who never converted are forgotten after fourteen days —
 * `STALE_AFTER_MS` in guest.ts, which /faq publishes as a promise.
 *
 * 04:00 UTC is four hours after the pool resets: the quietest hour for /try
 * in every timezone that is awake, and well clear of the midnight rush.
 */
crons.daily(
  'purge stale guests',
  { hourUTC: 4, minuteUTC: 0 },
  internal.guest.purgeStale,
  {},
)

export default crons
