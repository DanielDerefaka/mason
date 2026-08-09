import { internalMutation, mutation, query } from './_generated/server'
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
 * Puts a spent credit back.
 *
 * A credit is taken before the stream starts, which is right — once bytes are
 * flowing there is no request left to fail cleanly on. But a generation that
 * throws, or one the model cuts off at the output limit, produced nothing
 * usable and should not be charged for.
 *
 * Deliberately not capped: the only caller is a generation route refunding
 * what it just took, and clamping to a ceiling would silently swallow a bug
 * rather than surface it.
 */
export const refund = mutation({
  args: { amount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    const amount = args.amount ?? GENERATION_COST
    const row = await ctx.db
      .query('credits')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const next = (row?.balance ?? STARTING_CREDITS) + amount
    if (row) await ctx.db.patch(row._id, { balance: next })
    else await ctx.db.insert('credits', { userId, balance: next })

    return { balance: next }
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

/**
 * Tops every account up while there is no way to buy credits.
 *
 * internalMutation, so it is unreachable from the browser — a public
 * "give me credits" endpoint would make the balance meaningless. Run it from
 * the CLI:
 *
 *   npx convex run credits:grant '{"amount": 20}'
 *
 * Polar replaces this in chapter 24.
 */
export const grant = internalMutation({
  args: { amount: v.number() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query('users').collect()
    const granted: Array<{ email: string; balance: number }> = []

    for (const user of users) {
      const row = await ctx.db
        .query('credits')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .unique()

      // Accounts that have never spent have no row yet, so they start from the
      // default rather than from zero.
      const balance = (row?.balance ?? STARTING_CREDITS) + args.amount
      if (row) await ctx.db.patch(row._id, { balance })
      else await ctx.db.insert('credits', { userId: user._id, balance })

      granted.push({ email: user.email ?? user._id, balance })
    }

    return { users: granted.length, granted }
  },
})
