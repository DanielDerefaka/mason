import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/**
 * What a new account starts with. Until billing exists this is the whole
 * economy; once Polar is wired up it becomes the free allowance and top-ups
 * add to the same balance.
 */
export const STARTING_CREDITS = 10

/** What one generation costs. */
export const GENERATION_COST = 1

/**
 * A query cannot write, so an account with no row yet reports the starting
 * balance rather than creating one. The row appears on the first spend.
 */
export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null

    const row = await ctx.db
      .query('credits')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    return row?.balance ?? STARTING_CREDITS
  },
})

/**
 * Spends credits and returns the balance left. Throws rather than going
 * negative, so a caller that forgets to check still cannot overspend.
 */
export const spend = mutation({
  args: { amount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    const amount = args.amount ?? GENERATION_COST
    const row = await ctx.db
      .query('credits')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const balance = row?.balance ?? STARTING_CREDITS
    if (balance < amount) throw new Error('Out of credits')

    const next = balance - amount
    if (row) await ctx.db.patch(row._id, { balance: next })
    else await ctx.db.insert('credits', { userId, balance: next })

    return { balance: next }
  },
})
