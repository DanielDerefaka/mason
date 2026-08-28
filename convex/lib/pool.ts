import type { GenericDatabaseReader, GenericDatabaseWriter } from 'convex/server'
import type { DataModel, Doc, Id } from '../_generated/dataModel'
import { dayKey } from '../../src/lib/try/pool-day'

/**
 * What the pool, the guest record and the credits ledger all need to agree on.
 *
 * Kept in one place because the same three questions — how big is the pool,
 * how much of today's is gone, and has this guest already had their turn —
 * are asked by the banner, by `guest.me` and by `credits.spend`, and a
 * different answer in any one of them is a way to draw the pool twice.
 */

/** Twenty a day unless the deployment says otherwise. */
export const DEFAULT_POOL_SIZE = 20

export const poolSize = (): number => {
  const configured = Number(process.env.COMMUNITY_POOL_SIZE)
  return Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : DEFAULT_POOL_SIZE
}

export const poolDayRow = (db: GenericDatabaseReader<DataModel>, day: string) =>
  db
    .query('pool_days')
    .withIndex('by_day', (q) => q.eq('day', day))
    .unique()

export const guestRow = (db: GenericDatabaseReader<DataModel>, userId: Id<'users'>) =>
  db
    .query('guests')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()

/**
 * The guest row, created if it is somehow missing.
 *
 * The auth callback inserts one for every anonymous user, so this only ever
 * inserts for a user made before that callback existed. Cheaper than making
 * every caller handle the null.
 */
export const ensureGuestRow = async (
  db: GenericDatabaseWriter<DataModel>,
  userId: Id<'users'>,
  now: number = Date.now(),
): Promise<Doc<'guests'>> => {
  const existing = await guestRow(db, userId)
  if (existing) return existing
  const id = await db.insert('guests', { userId, createdAt: now, poolUses: 0, bonus: 0 })
  return (await db.get(id))!
}

/** One pool generation per guest per day, and only while the pool has room. */
export const poolAvailableFor = (
  guest: Pick<Doc<'guests'>, 'lastPoolDay'>,
  used: number,
  now: number = Date.now(),
): boolean => guest.lastPoolDay !== dayKey(now) && used < poolSize()

/** A guest's whole entitlement, as one number the credits pill can show. */
export const guestBalance = (
  guest: Pick<Doc<'guests'>, 'lastPoolDay' | 'bonus'>,
  used: number,
  now: number = Date.now(),
): number => guest.bonus + (poolAvailableFor(guest, used, now) ? 1 : 0)
