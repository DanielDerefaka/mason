import { internalQuery, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { dayKey } from '../src/lib/try/pool-day'
import { SUMMARISED_KINDS, bump, signalKind, type SummarisedKind } from './lib/signals'

/**
 * How the counters in `lib/signals.ts` are reached from outside a mutation.
 *
 * Two public writers and one internal reader. The writers only ever add one,
 * and the reader is internal because the numbers are for whoever is judging
 * the launch, not for the page.
 */

const DAYS_SUMMARISED = 14

export const record = mutation({
  args: { kind: signalKind },
  handler: async (ctx, { kind }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')
    await bump(ctx.db, kind)
  },
})

/**
 * A share link was opened. Public, because the visitor opening it has no
 * session — but it only counts when the token is a real one, so it cannot be
 * used to inflate the number from nothing.
 */
export const recordShareOpen = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const share = await ctx.db
      .query('shares')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique()
    if (!share) return
    await bump(ctx.db, 'share_opened')
  },
})

/**
 * The last fourteen days, per kind and per day.
 *
 *   npx convex run signals:summary
 *
 * internalQuery so it is unreachable from the browser.
 *
 * Reads the retired kinds too: a counter that was renamed mid-week still has
 * its earlier days on disk, and the summary is the only place they are seen.
 */
export const summary = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const days = Array.from({ length: DAYS_SUMMARISED }, (_, offset) =>
      dayKey(now - (DAYS_SUMMARISED - 1 - offset) * 24 * 60 * 60 * 1000),
    )

    const totals = Object.fromEntries(SUMMARISED_KINDS.map((kind) => [kind, 0])) as Record<
      SummarisedKind,
      number
    >
    const byDay: Array<{ day: string; counts: Partial<Record<SummarisedKind, number>> }> = []

    for (const day of days) {
      const counts: Partial<Record<SummarisedKind, number>> = {}
      for (const kind of SUMMARISED_KINDS) {
        const row = await ctx.db
          .query('signals')
          .withIndex('by_kind_day', (q) => q.eq('kind', kind).eq('day', day))
          .unique()
        if (row) {
          counts[kind] = row.count
          totals[kind] += row.count
        }
      }
      byDay.push({ day, counts })
    }

    return { from: days[0], to: days[days.length - 1], totals, days: byDay }
  },
})
