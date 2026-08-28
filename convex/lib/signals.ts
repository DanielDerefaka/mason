import { v } from 'convex/values'
import type { GenericDatabaseWriter } from 'convex/server'
import type { DataModel } from '../_generated/dataModel'
import { dayKey } from '../../src/lib/try/pool-day'

/**
 * The counters behind "did /try work?".
 *
 * Three of these are the signals the launch is judged on — keys pasted,
 * share links opened, emails given — and the rest are the denominators that
 * make those three mean something. A row per kind per UTC day rather than a
 * row per event: the question is ever only "how many this week", and a
 * counter answers it without a table that grows with every click.
 */
export const SIGNAL_KINDS = [
  'key_pasted',
  'share_opened',
  'email_given',
  'share_clicked',
  'pool_generation',
  'bonus_generation',
  'byok_generation',
  'remix',
  'guest_created',
] as const

export type SignalKind = (typeof SIGNAL_KINDS)[number]

/** The argument validator, so a public mutation cannot invent a new kind. */
export const signalKind = v.union(...SIGNAL_KINDS.map((kind) => v.literal(kind)))

/**
 * Adds one to today's counter for `kind`.
 *
 * Takes the database writer rather than a whole mutation context so the auth
 * callback — which the library hands a context typed over `AnyDataModel` —
 * can use it too.
 */
export const bump = async (
  db: GenericDatabaseWriter<DataModel>,
  kind: SignalKind,
  now: number = Date.now(),
): Promise<void> => {
  const day = dayKey(now)
  const row = await db
    .query('signals')
    .withIndex('by_kind_day', (q) => q.eq('kind', kind).eq('day', day))
    .unique()

  if (row) await db.patch(row._id, { count: row.count + 1 })
  else await db.insert('signals', { kind, day, count: 1 })
}
