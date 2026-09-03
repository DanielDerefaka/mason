/**
 * When the canvas is worth a copy of its own, taken without being asked, and
 * which copies to drop.
 *
 * The rules only, with no database in sight, so they can be tested: this is
 * `design-history.ts` for the whole canvas rather than one design's markup.
 * `convex/versions.ts` does the reading and writing and defers every
 * judgement to this file.
 */

/**
 * What put a version in the history. Rows from before this field existed
 * were all saved by hand, so a missing origin reads as `manual`.
 */
export type VersionOrigin = 'manual' | 'auto' | 'restore'

/**
 * How much work sits between two automatic copies.
 *
 * The canvas writes 1.2 s after it goes still, so a session is hundreds of
 * writes. One copy a minute leaves an hour's work as a list that can be read
 * top to bottom, and "put it back to before I moved everything" lands within
 * a minute of before. The history used to hold whatever somebody had pressed
 * Save for, which for most projects was nothing.
 */
export const CANVAS_CHECKPOINT_MS = 60_000

/** How many versions a project keeps, automatic and named together. */
export const VERSION_LIMIT = 30

/**
 * How many of those may be automatic. Named versions are the ones somebody
 * chose to keep, and a working half hour must not push them off the end.
 */
export const AUTO_LIMIT = 20

/**
 * The largest canvas this copies on its own.
 *
 * Every copy is read back whole when the list is opened and when the oldest
 * is pruned, and Convex stops a function that reads past 8 MiB. A canvas is
 * mostly its designs' markup; past this the minute-by-minute copies stop and
 * a person can still name a version by hand, which is one row.
 */
export const MAX_CHECKPOINT_BYTES = 200_000

/** Why a copy was or was not taken. `save` is the only one that writes. */
export type CheckpointDecision = 'save' | 'too-soon' | 'unchanged' | 'too-large' | 'empty'

const shapesOf = (data: unknown): unknown[] => {
  const shapes = (data as { shapes?: unknown } | null | undefined)?.shapes
  return Array.isArray(shapes) ? shapes : []
}

/**
 * Whether the canvas being overwritten deserves a copy first.
 *
 * `previous` is the stored canvas about to be replaced and `next` the one
 * replacing it. The copy is of what is being left, because that is the state
 * a person wants back; the incoming one is about to be the live row anyway.
 * `latest` is the newest version the project already has, of any origin.
 *
 * The cheap answers come first: this runs on every write that counts as an
 * edit, and fifty-nine times in sixty the answer is that it is too soon.
 */
export const decideCanvasCheckpoint = (
  latest: { createdAt: number; data: unknown } | null,
  previous: unknown,
  next: unknown,
  now: number,
): CheckpointDecision => {
  const before = shapesOf(previous)
  if (before.length === 0) return 'empty'
  if (latest && now - latest.createdAt < CANVAS_CHECKPOINT_MS) return 'too-soon'
  const serialised = JSON.stringify(before)
  if (serialised.length > MAX_CHECKPOINT_BYTES) return 'too-large'
  if (serialised === JSON.stringify(shapesOf(next))) return 'unchanged'
  if (latest && serialised === JSON.stringify(shapesOf(latest.data))) return 'unchanged'
  return 'save'
}

/**
 * Which versions to delete once a new one has been added.
 *
 * Automatic copies give way first, and only to each other: the oldest past
 * `AUTO_LIMIT` go. Then the project's overall cap applies to what is left,
 * oldest first, which is the rule named versions always had.
 */
export const toPruneVersions = <T extends { createdAt: number; origin?: VersionOrigin }>(
  rows: readonly T[],
): T[] => {
  const oldestFirst = [...rows].sort((a, b) => a.createdAt - b.createdAt)
  const automatic = oldestFirst.filter((row) => row.origin === 'auto')
  const staleAutomatic = new Set(automatic.slice(0, Math.max(0, automatic.length - AUTO_LIMIT)))
  const remaining = oldestFirst.filter((row) => !staleAutomatic.has(row))
  const overCap = remaining.slice(0, Math.max(0, remaining.length - VERSION_LIMIT))
  return [...staleAutomatic, ...overCap]
}
