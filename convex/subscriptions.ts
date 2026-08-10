import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'

/** Statuses Polar reports that still mean "this person can use the product". */
const LIVE = new Set(['active', 'trialing'])

/** Credits granted each time a subscription period is paid for. */
export const CREDITS_PER_PERIOD = 200

/**
 * Writes what Polar told us.
 *
 * Public, because the caller is a Next route handler and `fetchMutation`
 * cannot reach internal functions — but guarded by the same webhook secret
 * Polar signs with, which the browser has no way of knowing. The signature
 * check itself happens in the route, using Polar's SDK; this second check
 * exists so the mutation is not a way around it.
 *
 * That means POLAR_WEBHOOK_SECRET has to be set in two places: the Next
 * environment and the Convex deployment.
 *
 * Matched on Polar's subscription id rather than our user, because a webhook
 * can arrive before the customer is linked to an account — checkout collects
 * an email, and the row is claimed by whoever signs in with it.
 */
export const upsertFromPolar = mutation({
  args: {
    secret: v.string(),
    polarSubscriptionId: v.string(),
    polarCustomerId: v.optional(v.string()),
    polarProductId: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.string(),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    /** True on the events that represent a paid period, not a status change. */
    grantCredits: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.POLAR_WEBHOOK_SECRET
    if (!expected || args.secret !== expected) {
      throw new Error('Not authorised')
    }

    const existing = await ctx.db
      .query('subscriptions')
      .withIndex('by_polar_subscription', (q) =>
        q.eq('polarSubscriptionId', args.polarSubscriptionId),
      )
      .unique()

    // Link to an account when one already exists for the billing email.
    let userId = existing?.userId
    if (!userId && args.email) {
      const user = await ctx.db
        .query('users')
        .filter((q) => q.eq(q.field('email'), args.email))
        .first()
      userId = user?._id
    }

    const row = {
      userId,
      polarSubscriptionId: args.polarSubscriptionId,
      polarCustomerId: args.polarCustomerId,
      polarProductId: args.polarProductId,
      email: args.email,
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      updatedAt: Date.now(),
    }

    if (existing) await ctx.db.patch(existing._id, row)
    else await ctx.db.insert('subscriptions', row)

    if (args.grantCredits && userId && LIVE.has(args.status)) {
      const credits = await ctx.db
        .query('credits')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique()

      if (credits) {
        await ctx.db.patch(credits._id, { balance: credits.balance + CREDITS_PER_PERIOD })
      } else {
        await ctx.db.insert('credits', { userId, balance: CREDITS_PER_PERIOD })
      }
    }

    return { success: true }
  },
})

/**
 * Claims a subscription bought before the buyer had an account.
 *
 * Checkout only collects an email, so someone can pay and then sign up. This
 * attaches any unclaimed row with a matching address on their next read.
 */
export const claimByEmail = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return { claimed: 0 }

    const user = await ctx.db.get(userId)
    if (!user?.email) return { claimed: 0 }

    const orphans = await ctx.db
      .query('subscriptions')
      .withIndex('by_email', (q) => q.eq('email', user.email))
      .collect()

    let claimed = 0
    for (const row of orphans) {
      if (row.userId) continue
      await ctx.db.patch(row._id, { userId })
      claimed += 1
    }
    return { claimed }
  },
})

/** The signed-in user's subscription, or null. */
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null

    const rows = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', userId as Id<'users'>))
      .collect()

    // Newest first, so a resubscribe wins over a cancelled row.
    const row = rows.sort((a, b) => b.updatedAt - a.updatedAt)[0]
    if (!row) return null

    return {
      status: row.status,
      active: LIVE.has(row.status),
      currentPeriodEnd: row.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? false,
    }
  },
})

/** Whether this user may use the product. Read by the dashboard gate. */
export const isEntitled = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return false

    const rows = await ctx.db
      .query('subscriptions')
      .withIndex('by_user', (q) => q.eq('userId', userId as Id<'users'>))
      .collect()

    return rows.some((row) => LIVE.has(row.status))
  },
})

/**
 * Whether this deployment can actually record a subscription.
 *
 * The webhook secret lives in two places — the Next environment, to verify
 * Polar's signature, and here, to authorise the mutation that writes the row.
 * Nothing used to check the second one existed, and missing it fails in the
 * worst possible way: the signature passes, the mutation throws, the route
 * answers 500, and Polar retries forever. The customer has paid and the
 * subscription never activates.
 *
 * Public and boolean on purpose. It reveals whether a variable is set, never
 * its value.
 */
export const billingReady = query({
  args: {},
  handler: async () => Boolean(process.env.POLAR_WEBHOOK_SECRET),
})
