import { v } from 'convex/values'
import type { GenericDatabaseWriter } from 'convex/server'
import type { DataModel } from '../_generated/dataModel'
import { dayKey } from '../../src/lib/try/pool-day'

/**
 * The counters behind "did /try work?".
 *
 * The signals the launch is judged on — keys pasted, share links opened, the
 * three moments an email arrives, a checkout started, a subscription paid —
 * and the denominators that make them mean something. A row per kind per UTC
 * day rather than a row per event: the question is ever only "how many this
 * week", and a counter answers it without a table that grows with every
 * click.
 */
export const SIGNAL_KINDS = [
  'key_pasted',
  'share_opened',
  'gate_email_given',
  'guest_converted',
  'claim_redeemed',
  'share_clicked',
  'pool_generation',
  'bonus_generation',
  'byok_generation',
  'remix',
  'guest_created',
  'checkout_started',
  'subscription_paid',
] as const

export type SignalKind = (typeof SIGNAL_KINDS)[number]

/**
 * Kinds no longer written but still on disk.
 *
 * `email_given` was one counter for three different moments: an address typed
 * into the export gate, a guest becoming an account, and a claim link redeemed
 * on another browser. Those are separate steps of the funnel, and one number
 * could not say which of them was moving. Retired rather than deleted so
 * `summary` still reads the rows it left, while `bump` refuses the old name at
 * compile time. The table's `kind` is a plain string, so nothing migrates.
 */
export const RETIRED_SIGNAL_KINDS = ['email_given'] as const

export type SummarisedKind = SignalKind | (typeof RETIRED_SIGNAL_KINDS)[number]

export const SUMMARISED_KINDS: readonly SummarisedKind[] = [
  ...SIGNAL_KINDS,
  ...RETIRED_SIGNAL_KINDS,
]

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
