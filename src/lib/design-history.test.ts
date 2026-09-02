import { describe, expect, it } from 'vitest'

import {
  CHECKPOINT_MS,
  HISTORY_LIMIT,
  MAX_HISTORY_HTML,
  decideCheckpoint,
  originForNew,
  toPrune,
} from './design-history'

const NOW = 1_700_000_000_000

const snapshot = (createdAt: number, html = '<p>a</p>') => ({ createdAt, html })

describe('decideCheckpoint', () => {
  /**
   * The entry the whole feature exists for. A design with no history is about
   * to be edited for the first time, and the markup on the way out is the last
   * chance to record what it looked like before anybody touched it.
   */
  it('always records the first snapshot a design ever takes', () => {
    expect(decideCheckpoint(null, '<p>a</p>', NOW)).toBe('save')
  })

  it('records again once a checkpoint has gone stale', () => {
    expect(decideCheckpoint(snapshot(NOW - CHECKPOINT_MS), '<p>b</p>', NOW)).toBe('save')
  })

  /**
   * What shipped broken if this ever regresses: a save fires on a 900ms
   * debounce, so a paragraph typed at speed is dozens of them. Without the
   * interval, one sentence would push every earlier state out of a
   * twenty-entry history and the morning's layout would be gone.
   */
  it('leaves the history alone during a run of edits', () => {
    expect(decideCheckpoint(snapshot(NOW - 1000), '<p>b</p>', NOW)).toBe('too-soon')
    expect(decideCheckpoint(snapshot(NOW - CHECKPOINT_MS + 1), '<p>b</p>', NOW)).toBe('too-soon')
  })

  /**
   * Reopening the editor and changing nothing must not add an entry, or a week
   * of looking at a design would bury the state it was actually in.
   */
  it('does not record markup identical to the newest snapshot', () => {
    expect(decideCheckpoint(snapshot(NOW - CHECKPOINT_MS * 10), '<p>a</p>', NOW)).toBe('unchanged')
  })

  /**
   * A checkpoint runs after a save that already succeeded. Throwing here would
   * report a failure for an edit that was written, so an oversized design is
   * skipped rather than fatal.
   */
  it('skips markup too large for a document instead of failing', () => {
    const huge = 'x'.repeat(MAX_HISTORY_HTML + 1)
    expect(decideCheckpoint(null, huge, NOW)).toBe('too-large')
  })

  /**
   * Empty markup is a design that has not painted yet, not a state worth
   * getting back to. Recording it would offer a blank page as a restore.
   */
  it('never records an empty design', () => {
    expect(decideCheckpoint(null, '   \n ', NOW)).toBe('empty')
  })
})

describe('originForNew', () => {
  it('calls the first snapshot the original and everything after it an edit', () => {
    expect(originForNew(0)).toBe('original')
    expect(originForNew(1)).toBe('edit')
    expect(originForNew(HISTORY_LIMIT)).toBe('edit')
  })
})

describe('toPrune', () => {
  const history = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ createdAt: NOW + index, id: index }))

  it('drops nothing while the history is within the limit', () => {
    expect(toPrune(history(HISTORY_LIMIT + 1))).toEqual([])
  })

  /**
   * The exemption, and the reason this is not a plain `slice`. A design edited
   * every five minutes for two hours has long since passed the limit, and the
   * entry it will actually be asked for is the one from before any of it.
   */
  it('never drops the earliest snapshot', () => {
    const rows = history(HISTORY_LIMIT + 5)
    const dropped = toPrune(rows)
    expect(dropped).toHaveLength(4)
    expect(dropped.map((row) => row.id)).toEqual([1, 2, 3, 4])
    expect(dropped).not.toContainEqual(rows[0])
  })

  /** Rows arrive in whatever order the index gave them, newest first in practice. */
  it('reads the order out of the timestamps rather than trusting the input', () => {
    const rows = [...history(HISTORY_LIMIT + 2)].reverse()
    expect(toPrune(rows).map((row) => row.id)).toEqual([1])
  })

  it('has nothing to do for a design with one snapshot', () => {
    expect(toPrune(history(1))).toEqual([])
    expect(toPrune([])).toEqual([])
  })
})
