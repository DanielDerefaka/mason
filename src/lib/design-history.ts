/**
 * When a design's markup is worth keeping a copy of, and which copies to drop.
 *
 * The rules only, with no database in sight, so they can be tested: this repo
 * runs vitest over `src/` and has no Convex harness, and the Convex side
 * imports from here exactly as `convex/lib/pool.ts` imports `limits`. The
 * mutations in `convex/design_versions.ts` do the reading and writing and
 * defer every judgement to this file.
 */

/** What put a snapshot in the history. */
export type Origin = 'original' | 'edit' | 'restore'

/**
 * How much editing has to sit between two snapshots.
 *
 * Not every save: the editor debounces at 900ms and short-circuits identical
 * markup, so a minute of typing is still tens of writes and would fill the
 * whole history with one sentence. Five minutes is coarse enough that a
 * session leaves a handful of entries and fine enough that "put it back to
 * before lunch" lands somewhere near lunch.
 */
export const CHECKPOINT_MS = 5 * 60 * 1000

/**
 * How many snapshots a design keeps, over and above the first one.
 *
 * The first is exempt; see `toPrune`. Twenty covers several days of real work
 * at one entry per five minutes of editing.
 */
export const HISTORY_LIMIT = 20

/**
 * The largest markup this will store.
 *
 * A Convex document has a hard ceiling and an insert past it throws. A
 * checkpoint runs on the way out of a successful save, so a throw there would
 * turn "your history is full" into an error on an edit that already worked.
 * Generated designs run to tens of kilobytes, so this never fires in practice;
 * it exists so that the one that does is skipped quietly instead.
 */
export const MAX_HISTORY_HTML = 512_000

/** Why a checkpoint was or was not taken. `save` is the only one that writes. */
export type Decision = 'save' | 'too-soon' | 'unchanged' | 'too-large' | 'empty'

/**
 * Whether this markup should be added to the history.
 *
 * `latest` is the newest snapshot the design already has, or null when it has
 * none. Every answer but `save` is a reason to do nothing, kept distinct
 * because the difference between "I skipped that on purpose" and "that
 * failed" is the whole value of the return.
 */
export const decideCheckpoint = (
  latest: { createdAt: number; html: string } | null,
  html: string,
  now: number,
): Decision => {
  if (html.trim().length === 0) return 'empty'
  if (html.length > MAX_HISTORY_HTML) return 'too-large'
  if (!latest) return 'save'
  if (latest.html === html) return 'unchanged'
  if (now - latest.createdAt < CHECKPOINT_MS) return 'too-soon'
  return 'save'
}

/**
 * The first snapshot a design takes is the state before anybody edited it.
 *
 * True whenever the history starts empty, which is the only time this is
 * asked. It is a claim about this design's history and not about the model:
 * a design edited before the history existed records its first snapshot the
 * next time it is touched, and that snapshot is still the earliest state
 * anyone can get back to, which is what the label on it says.
 */
export const originForNew = (existingCount: number): Origin =>
  existingCount === 0 ? 'original' : 'edit'

/**
 * Which snapshots to delete, once a new one has been added.
 *
 * The oldest is exempt. It is the state the design was in before the first
 * edit, and "give me back what it was to begin with" is the request the
 * history exists to answer; letting an afternoon of edits push it off the end
 * would drop the one version that cannot be reconstructed. Exempted by its
 * position rather than by its `origin`, so a history whose labels are somehow
 * wrong still keeps its earliest entry.
 */
export const toPrune = <T extends { createdAt: number }>(rows: readonly T[]): T[] => {
  const oldestFirst = [...rows].sort((a, b) => a.createdAt - b.createdAt)
  const prunable = oldestFirst.slice(1)
  return prunable.slice(0, Math.max(0, prunable.length - HISTORY_LIMIT))
}
