import { query } from './_generated/server'
import { dayKey, nextResetAt } from '../src/lib/try/pool-day'
import { poolDayRow, poolSize } from './lib/pool'

/**
 * The community pool as the banner sees it.
 *
 * Public and unauthenticated: the number is shown before a guest has a
 * session, and it reveals nothing about anyone — only how much of today's
 * shared allowance is left.
 */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const day = dayKey(now)
    const size = poolSize()
    const used = (await poolDayRow(ctx.db, day))?.used ?? 0

    return {
      day,
      size,
      used,
      remaining: Math.max(0, size - used),
      resetsAt: nextResetAt(now),
    }
  },
})
