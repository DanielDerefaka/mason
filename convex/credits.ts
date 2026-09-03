import { internalMutation, mutation, query, type MutationCtx } from './_generated/server'
import { ConvexError, v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'
import { dayKey } from '../src/lib/try/pool-day'
import { ensureGuestRow, guestBalance, guestRow, poolAvailableFor, poolDayRow } from './lib/pool'
import { bump } from './lib/signals'

/**
 * What a new account starts with. Until billing exists this is the whole
 * economy; once Polar is wired up it becomes the free allowance and top-ups
 * add to the same balance.
 */
export const STARTING_CREDITS = 10

/** What one generation costs. */
export const GENERATION_COST = 1

/**
 * Guests are a different economy.
 *
 * An anonymous user has no balance of their own: they draw on the community
 * pool once a day, then on whatever they earned by sharing. The three
 * functions below branch on `isAnonymous` before anything else, so the
 * account path underneath is exactly what it was — and the guest path never
 * touches the `credits` table, so converting to an account starts them on the
 * normal allowance.
 */
const isAnonymous = async (ctx: MutationCtx, userId: Id<'users'>) =>
  (await ctx.db.get(userId))?.isAnonymous === true

/**
 * A one-shot ticket handed out by a spend and required by the refund that
 * undoes it.
 *
 * The regression this exists for: `refund` is a public mutation — it has to
 * be, the route that calls it holds a user token, not an admin one — and it
 * used to take nothing but an amount. Anyone with a browser console could
 * call it in a loop and mint credits, and on /try it was worse than that:
 * the guest path put the community pool draw back, so one visitor could have
 * spent the whole day's free generations on the house key without ever
 * running out. The ticket makes a refund the undoing of a specific spend
 * rather than a standing offer.
 *
 * Two overlapping generations overwrite one another's ticket, so the earlier
 * one's refund is refused. That direction is deliberate: a lost refund costs
 * one credit, an accepted duplicate is free money.
 */
const newTicket = () => `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')

/**
 * Thrown when there is nothing left to spend. A ConvexError rather than a
 * plain one because production redacts the message of anything else to
 * "Server Error", and the route needs to tell this apart from a real fault to
 * answer 402 instead of 500.
 */
const outOfCredits = () => new ConvexError({ code: 'OUT_OF_CREDITS' })

/** A guest's row and the rest of their entitlement, in one read. */
const guestState = async (ctx: MutationCtx, userId: Id<'users'>, now: number) => {
  const guest = await ensureGuestRow(ctx.db, userId, now)
  const pool = await poolDayRow(ctx.db, dayKey(now))
  return { guest, pool, used: pool?.used ?? 0 }
}

/**
 * A query cannot write, so an account with no row yet reports the starting
 * balance rather than creating one. The row appears on the first spend.
 */
export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null

    const user = await ctx.db.get(userId)
    if (user?.isAnonymous) {
      // Never the ten-credit fallback: a guest's balance is the pool turn
      // they may still have plus what they earned, and nothing else.
      const now = Date.now()
      const guest = (await guestRow(ctx.db, userId)) ?? { lastPoolDay: undefined, bonus: 0 }
      const used = (await poolDayRow(ctx.db, dayKey(now)))?.used ?? 0
      return guestBalance(guest, used, now)
    }

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
 * Deliberately not capped in amount: the only caller is a generation route
 * refunding what it just took, and clamping to a ceiling would silently
 * swallow a bug rather than surface it. It is capped in *number*, which is
 * what matters — the ticket minted by that spend is required, and spent by
 * this call, so a refund cannot be replayed. A refund with no ticket, or a
 * stale one, is not an error: the routes refund on failure paths that
 * sometimes run before a spend ever happened. It simply gives nothing back.
 */
export const refund = mutation({
  args: { amount: v.optional(v.number()), ticket: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    if (await isAnonymous(ctx, userId)) return refundGuest(ctx, userId, args.ticket)

    const amount = args.amount ?? GENERATION_COST
    const row = await ctx.db
      .query('credits')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const balance = row?.balance ?? STARTING_CREDITS
    if (!row || !args.ticket || row.refundTicket !== args.ticket) return { balance }

    const next = balance + amount
    await ctx.db.patch(row._id, { balance: next, refundTicket: undefined })
    return { balance: next }
  },
})

/**
 * A guest's refund goes back where the spend came from.
 *
 * The pool draw is returned to the day it was taken from — `lastPoolDay`,
 * not today — so a generation that failed just after midnight does not hand
 * tomorrow's pool an extra slot. Nothing to put back is not an error: the
 * routes refund on every failure path, including ones before a spend.
 */
const refundGuest = async (ctx: MutationCtx, userId: Id<'users'>, ticket?: string) => {
  const now = Date.now()
  const { guest } = await guestState(ctx, userId, now)
  const used = () => poolDayRow(ctx.db, dayKey(now)).then((row) => row?.used ?? 0)

  if (!ticket || guest.refundTicket !== ticket) {
    return { balance: guestBalance(guest, await used(), now) }
  }

  if (guest.lastSpendSource === 'pool') {
    const pool = guest.lastPoolDay ? await poolDayRow(ctx.db, guest.lastPoolDay) : null
    if (pool) await ctx.db.patch(pool._id, { used: Math.max(0, pool.used - 1) })
    // `poolUses` stays. It counts turns taken and nothing reads it for
    // availability, which `lastPoolDay` alone decides; what reads it is
    // `canClaimShare`, and a design cut short and refunded is still a
    // design the guest made, kept on the canvas and worth sharing. Taking
    // the turn back off the count left them unable to share it for the bonus.
    await ctx.db.patch(guest._id, {
      lastPoolDay: undefined,
      lastSpendSource: undefined,
      refundTicket: undefined,
    })
  } else if (guest.lastSpendSource === 'bonus') {
    await ctx.db.patch(guest._id, {
      bonus: guest.bonus + 1,
      lastSpendSource: undefined,
      refundTicket: undefined,
    })
  }

  const fresh = (await ctx.db.get(guest._id))!
  return { balance: guestBalance(fresh, await used(), now) }
}

/**
 * Spends credits and returns the balance left. Throws rather than going
 * negative, so a caller that forgets to check still cannot overspend.
 */
export const spend = mutation({
  args: { amount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error('Not authenticated')

    if (await isAnonymous(ctx, userId)) return spendGuest(ctx, userId)

    const amount = args.amount ?? GENERATION_COST
    const row = await ctx.db
      .query('credits')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const balance = row?.balance ?? STARTING_CREDITS
    if (balance < amount) throw outOfCredits()

    const next = balance - amount
    const refundTicket = newTicket()
    if (row) await ctx.db.patch(row._id, { balance: next, refundTicket })
    else await ctx.db.insert('credits', { userId, balance: next, refundTicket })

    return { balance: next, source: 'account' as const, refund: refundTicket }
  },
})

/**
 * A guest's spend: the pool first, then what they earned.
 *
 * The pool counter and the guest's own record change in this one mutation,
 * and a Convex mutation is a transaction — so two guests racing for the last
 * slot cannot both get it, and a guest cannot take two turns by opening two
 * tabs. Always one generation regardless of `amount`: a guest has no balance
 * that a larger amount could be taken from.
 */
const spendGuest = async (ctx: MutationCtx, userId: Id<'users'>) => {
  const now = Date.now()
  const day = dayKey(now)
  const { guest, pool, used } = await guestState(ctx, userId, now)

  const refundTicket = newTicket()

  if (poolAvailableFor(guest, used, now)) {
    if (pool) await ctx.db.patch(pool._id, { used: used + 1 })
    else await ctx.db.insert('pool_days', { day, used: 1 })
    await ctx.db.patch(guest._id, {
      lastPoolDay: day,
      poolUses: guest.poolUses + 1,
      lastSpendSource: 'pool',
      refundTicket,
    })
    await bump(ctx.db, 'pool_generation', now)
    return { balance: guest.bonus, source: 'pool' as const, refund: refundTicket }
  }

  if (guest.bonus > 0) {
    const bonus = guest.bonus - 1
    await ctx.db.patch(guest._id, { bonus, lastSpendSource: 'bonus', refundTicket })
    await bump(ctx.db, 'bonus_generation', now)
    return { balance: bonus, source: 'bonus' as const, refund: refundTicket }
  }

  throw outOfCredits()
}

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
