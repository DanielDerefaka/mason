import { internalMutation, mutation, query, type MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { dayKey } from '../src/lib/try/pool-day'
import { looksLikeEmail, normaliseEmail } from '../src/lib/try/email'
import { ensureGuestRow, guestRow, poolAvailableFor, poolDayRow } from './lib/pool'
import { bump } from './lib/signals'

/**
 * The anonymous user's side of /try: what they are entitled to, what they
 * have earned, and how their work follows them into a real account.
 *
 * Nothing here touches the `users` table beyond reading `isAnonymous`. The
 * guest's state lives in `guests`, which the auth callback creates alongside
 * the user, so a guest always has a row — `ensureGuestRow` is there for the
 * one that somehow does not.
 */

/** New anonymous sessions one network may open in a UTC day. */
export const GUEST_SESSIONS_PER_IP_PER_DAY = 10

/** What sharing on X is worth, once. */
export const SHARE_BONUS = 2

/**
 * How long a project claim stays redeemable. The flow is mint, sign in,
 * redeem — seconds apart — so anything older is a token that leaked.
 */
const CLAIM_TTL_MS = 15 * 60 * 1000

/**
 * A guest who never converted is forgotten after this.
 *
 * Fourteen days, and /faq says so in as many words — which is the reason it is
 * fourteen rather than the thirty it was. The page and the constant are one
 * claim made in two places, and the page is the half a stranger reads.
 *
 * The auth cookie outlives this deliberately (thirty days, `middleware.ts`):
 * it is the same cookie a real account is held by, and shortening it would
 * sign account holders out to shorten a guest's retention.
 */
const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000

const PURGE_BATCH = 50

const requireUser = async (ctx: MutationCtx) => {
  const userId = await getAuthUserId(ctx)
  if (userId === null) throw new Error('Not authenticated')
  return userId
}

/** Same recipe as a share token: two UUIDs' worth of hex, forty characters. */
const newToken = () =>
  `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '').slice(0, 40)

/** What a signed-in, non-anonymous user sees: no guest chrome at all. */
const NOT_A_GUEST = {
  isGuest: false,
  bonus: 0,
  poolAvailable: false,
  poolUsedToday: false,
  poolUses: 0,
  shareClaimed: false,
  canClaimShare: false,
  keyAdded: false,
  // An account has already told us who it is; the export gate never opens.
  emailGiven: true,
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null

    const user = await ctx.db.get(userId)
    if (!user?.isAnonymous) return NOT_A_GUEST

    const now = Date.now()
    const guest = (await guestRow(ctx.db, userId)) ?? {
      lastPoolDay: undefined,
      poolUses: 0,
      bonus: 0,
      sharedAt: undefined,
      keyAddedAt: undefined,
      emailAt: undefined,
    }
    const used = (await poolDayRow(ctx.db, dayKey(now)))?.used ?? 0
    const shareClaimed = guest.sharedAt !== undefined

    return {
      isGuest: true,
      bonus: guest.bonus,
      poolAvailable: poolAvailableFor(guest, used, now),
      poolUsedToday: guest.lastPoolDay === dayKey(now),
      poolUses: guest.poolUses,
      shareClaimed,
      canClaimShare: guest.poolUses >= 1 && !shareClaimed,
      keyAdded: guest.keyAddedAt !== undefined,
      emailGiven: guest.emailAt !== undefined,
    }
  },
})

/**
 * The +2 for sharing on X.
 *
 * Once per guest, and only after a pool generation: the share is of a design,
 * so there has to be one, and it is the pool that makes the first one free.
 * Claiming twice is a no-op rather than an error — the button can be pressed
 * again after the tab that opened X comes back.
 */
export const claimShare = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx)
    const now = Date.now()

    const user = await ctx.db.get(userId)
    if (!user?.isAnonymous) {
      // A signed-in user can share too; there is nothing to credit them with.
      await bump(ctx.db, 'share_clicked', now)
      return { bonus: 0 }
    }

    const guest = await ensureGuestRow(ctx.db, userId, now)
    if (guest.sharedAt !== undefined) return { bonus: guest.bonus }
    if (guest.poolUses < 1) throw new Error('Generate a design first, then share it')

    const bonus = guest.bonus + SHARE_BONUS
    await ctx.db.patch(guest._id, { bonus, sharedAt: now })
    await bump(ctx.db, 'share_clicked', now)
    return { bonus }
  },
})

/**
 * Records that a guest pasted their own key. The key itself never reaches
 * Convex — this is the signal, not the secret.
 */
export const markKeyAdded = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx)
    const now = Date.now()

    const user = await ctx.db.get(userId)
    if (!user?.isAnonymous) return null

    const guest = await ensureGuestRow(ctx.db, userId, now)
    if (guest.keyAddedAt !== undefined) return null

    await ctx.db.patch(guest._id, { keyAddedAt: now })
    await bump(ctx.db, 'key_pasted', now)
    return null
  },
})

/**
 * The address a visitor gives to take a download away.
 *
 * The free week's one ask. It replaces the account the export gate used to
 * demand: a trial that says "no account needed" and then demands one at the
 * only moment the work is worth something is a trial that lies, so the gate
 * takes an email and gets out of the way — once, for ever, per session.
 *
 * Idempotent in both directions. A guest who is asked twice (two tabs, a
 * race) writes one row; an address already on the list has its `hits`
 * counted rather than a second row inserted. Neither ever throws, because a
 * download must not fail on the bookkeeping behind it.
 */
export const recordEmail = mutation({
  args: { email: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, { email, source }) => {
    const userId = await requireUser(ctx)
    const now = Date.now()

    const address = normaliseEmail(email)
    // Validated here as well as at the box: the mutation is callable from the
    // browser, and the table is the launch list.
    if (!looksLikeEmail(address)) throw new Error('That does not look like an email address')

    const existing = await ctx.db
      .query('emails')
      .withIndex('by_email', (q) => q.eq('email', address))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        updatedAt: now,
        hits: existing.hits + 1,
        // A row left ownerless by a purge is re-attached to whoever is here
        // now; one that already names somebody is not reassigned.
        userId: existing.userId ?? userId,
      })
    } else {
      await ctx.db.insert('emails', {
        email: address,
        userId,
        source: source ?? 'export',
        createdAt: now,
        updatedAt: now,
        hits: 1,
      })
    }

    const user = await ctx.db.get(userId)
    if (user?.isAnonymous) {
      const guest = await ensureGuestRow(ctx.db, userId, now)
      if (guest.emailAt === undefined) await ctx.db.patch(guest._id, { emailAt: now })
    }

    await bump(ctx.db, 'email_given', now)
    return { ok: true }
  },
})

/**
 * Mints a handover token for one of the caller's projects.
 *
 * Used when a guest's email already has an account: signing in swaps the
 * session to that account, which would strand the project on the anonymous
 * user. The guest mints this first, signs in, then redeems it.
 */
export const issueClaim = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const userId = await requireUser(ctx)

    const project = await ctx.db.get(projectId)
    if (!project || project.userId !== userId) throw new Error('Project not found')

    const token = newToken()
    await ctx.db.insert('project_claims', {
      token,
      projectId,
      fromUserId: userId,
      createdAt: Date.now(),
    })
    return { token }
  },
})

/**
 * Moves the claimed project to the caller. Everything that answers to the
 * project's owner — its versions, its share links, its gallery entries —
 * moves with it, or the new owner could see the project and not its links.
 */
export const redeemClaim = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const userId = await requireUser(ctx)
    const now = Date.now()

    const claim = await ctx.db
      .query('project_claims')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique()
    if (!claim) throw new Error('Claim not found')

    // Redeemed or not, a claim is single-use.
    await ctx.db.delete(claim._id)
    if (now - claim.createdAt > CLAIM_TTL_MS) throw new Error('Claim expired')

    const project = await ctx.db.get(claim.projectId)
    if (!project) throw new Error('Project not found')
    if (project.userId === userId) return { projectId: project._id }
    if (project.userId !== claim.fromUserId) throw new Error('Project has already moved')

    await ctx.db.patch(project._id, { userId, lastModified: now })

    const versions = await ctx.db
      .query('versions')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect()
    for (const version of versions) await ctx.db.patch(version._id, { userId })

    const shares = await ctx.db
      .query('shares')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect()
    for (const share of shares) await ctx.db.patch(share._id, { userId })

    const gallery = await ctx.db
      .query('gallery')
      .withIndex('by_user', (q) => q.eq('userId', claim.fromUserId))
      .collect()
    for (const item of gallery) {
      if (item.projectId === project._id) await ctx.db.patch(item._id, { userId })
    }

    await bump(ctx.db, 'email_given', now)
    return { projectId: project._id }
  },
})

/**
 * The per-network throttle on new guest sessions.
 *
 * Internal: only the auth action calls it, with an ipHash it got from a
 * signed admission token. Ten a day is generous for a household and useless
 * for a script.
 */
export const admitIp = internalMutation({
  args: { ipHash: v.string(), day: v.string() },
  handler: async (ctx, { ipHash, day }) => {
    const row = await ctx.db
      .query('guest_ips')
      .withIndex('by_ip_day', (q) => q.eq('ipHash', ipHash).eq('day', day))
      .unique()

    const count = row?.count ?? 0
    if (count >= GUEST_SESSIONS_PER_IP_PER_DAY) {
      throw new Error('Too many guest sessions from this network today')
    }

    if (row) await ctx.db.patch(row._id, { count: count + 1 })
    else await ctx.db.insert('guest_ips', { ipHash, day, count: 1 })
    return { count: count + 1 }
  },
})

/** Everything an anonymous user left behind, removed in one transaction. */
const purgeGuest = async (ctx: MutationCtx, guest: Doc<'guests'>) => {
  const userId = guest.userId
  const dropBlob = (storageId: string | undefined) =>
    storageId ? ctx.storage.delete(storageId as Id<'_storage'>).catch(() => {}) : Promise.resolve()

  const gallery = await ctx.db
    .query('gallery')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  for (const item of gallery) {
    await dropBlob(item.sketchStorageId)
    await ctx.db.delete(item._id)
  }

  const projects = await ctx.db
    .query('projects')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  for (const project of projects) {
    for (const storageId of [
      ...(project.inspirationImages ?? []),
      ...(project.moodBoardImages ?? []),
      ...(project.brand?.logo ? [project.brand.logo] : []),
    ]) {
      await dropBlob(storageId)
    }

    const versions = await ctx.db
      .query('versions')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect()
    for (const version of versions) await ctx.db.delete(version._id)

    const shares = await ctx.db
      .query('shares')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect()
    for (const share of shares) {
      await dropBlob(share.previewStorageId)
      await ctx.db.delete(share._id)
    }

    await ctx.db.delete(project._id)
  }

  // The address stays; the link to the user does not. Deleting the row would
  // make the nightly purge quietly eat the launch list a fortnight after
  // each visit, which is the one thing this table exists to prevent.
  const emails = await ctx.db
    .query('emails')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  for (const row of emails) await ctx.db.patch(row._id, { userId: undefined })

  for (const table of ['credits', 'project_counters'] as const) {
    const rows = await ctx.db
      .query(table)
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    for (const row of rows) await ctx.db.delete(row._id)
  }

  // Claims are minutes-lived and few; a scan is cheaper than an index.
  const claims = await ctx.db
    .query('project_claims')
    .filter((q) => q.eq(q.field('fromUserId'), userId))
    .collect()
  for (const claim of claims) await ctx.db.delete(claim._id)

  const sessions = await ctx.db
    .query('authSessions')
    .withIndex('userId', (q) => q.eq('userId', userId))
    .collect()
  for (const session of sessions) {
    const tokens = await ctx.db
      .query('authRefreshTokens')
      .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
      .collect()
    for (const token of tokens) await ctx.db.delete(token._id)
    await ctx.db.delete(session._id)
  }

  const accounts = await ctx.db
    .query('authAccounts')
    .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
    .collect()
  for (const account of accounts) await ctx.db.delete(account._id)

  await ctx.db.delete(guest._id)
  await ctx.db.delete(userId)
}

/**
 * Forgets anonymous users who never came back.
 *
 * Run daily by the cron. Fifty at a time, rescheduling itself while there
 * are more, so a backlog cannot push one mutation past its limits. A guest
 * whose user is no longer anonymous is never purged whatever the row says —
 * the row is marked converted instead, so it stops being found.
 */
export const purgeStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const cutoff = now - STALE_AFTER_MS

    // Indexed, not filtered: `.filter` reads every guest row ever made — the
    // converted ones are kept for ever, so an unindexed nightly scan gets
    // slower every week and eventually costs more than the rows it deletes.
    const stale = await ctx.db
      .query('guests')
      .withIndex('by_converted_created', (q) =>
        q.eq('convertedAt', undefined).lt('createdAt', cutoff),
      )
      .take(PURGE_BATCH)

    let purged = 0
    for (const guest of stale) {
      const user = await ctx.db.get(guest.userId)
      if (user && !user.isAnonymous) {
        await ctx.db.patch(guest._id, { convertedAt: now })
        continue
      }
      if (user) await purgeGuest(ctx, guest)
      else await ctx.db.delete(guest._id)
      purged += 1
    }

    const more = stale.length === PURGE_BATCH
    if (more) await ctx.scheduler.runAfter(0, internal.guest.purgeStale, {})
    return { purged, more }
  },
})
