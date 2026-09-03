import { describe, expect, it } from 'vitest'

import {
  AUTO_LIMIT,
  CANVAS_CHECKPOINT_MS,
  MAX_CHECKPOINT_BYTES,
  VERSION_LIMIT,
  decideCanvasCheckpoint,
  toPruneVersions,
  type VersionOrigin,
} from './canvas-history'

const NOW = 1_700_000_000_000

const canvas = (...ids: string[]) => ({
  shapes: ids.map((id) => ({ id, kind: 'rectangle', x: 0, y: 0 })),
})

const huge = () => ({ shapes: [{ id: 'a', html: 'x'.repeat(MAX_CHECKPOINT_BYTES) }] })

/**
 * The version history only ever held what somebody had pressed Save for,
 * which for most projects was nothing: the panel promised a way back and
 * had one entry to offer. These are the rules for the copies taken without
 * being asked.
 */
describe('when the canvas is copied', () => {
  it('copies the canvas being left when the project has no versions yet', () => {
    expect(decideCanvasCheckpoint(null, canvas('a'), canvas('a', 'b'), NOW)).toBe('save')
  })

  it('has nothing to copy from an empty canvas', () => {
    expect(decideCanvasCheckpoint(null, {}, canvas('a'), NOW)).toBe('empty')
    expect(decideCanvasCheckpoint(null, undefined, canvas('a'), NOW)).toBe('empty')
    expect(decideCanvasCheckpoint(null, { shapes: 'no' }, canvas('a'), NOW)).toBe('empty')
  })

  it('waits a minute after the newest version, whoever made it', () => {
    const latest = { createdAt: NOW - CANVAS_CHECKPOINT_MS + 1, data: canvas('z') }
    expect(decideCanvasCheckpoint(latest, canvas('a'), canvas('b'), NOW)).toBe('too-soon')
    const older = { ...latest, createdAt: NOW - CANVAS_CHECKPOINT_MS }
    expect(decideCanvasCheckpoint(older, canvas('a'), canvas('b'), NOW)).toBe('save')
  })

  it('does not copy a canvas the write leaves as it was', () => {
    expect(decideCanvasCheckpoint(null, canvas('a'), canvas('a'), NOW)).toBe('unchanged')
  })

  it('does not copy what the newest version already holds', () => {
    const latest = { createdAt: NOW - 2 * CANVAS_CHECKPOINT_MS, data: canvas('a') }
    expect(decideCanvasCheckpoint(latest, canvas('a'), canvas('b'), NOW)).toBe('unchanged')
  })

  /**
   * Thirty of these are read back whole whenever the list opens or the
   * oldest is pruned, and Convex stops a function past 8 MiB of reads. A
   * checkpoint runs inside the save, so a copy that broke the read limit
   * would break every save after it.
   */
  it('skips a canvas too large to keep thirty of', () => {
    expect(decideCanvasCheckpoint(null, huge(), canvas('b'), NOW)).toBe('too-large')
  })

  /** This runs on every write that counts as an edit; the common answer must be the cheap one. */
  it('answers "too soon" before it serialises anything', () => {
    const latest = { createdAt: NOW, data: {} }
    expect(decideCanvasCheckpoint(latest, huge(), canvas('b'), NOW)).toBe('too-soon')
  })
})

const rows = (count: number, origin: VersionOrigin | undefined, from = 0) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${origin ?? 'legacy'}${from + index}`,
    createdAt: from + index,
    origin,
  }))

const ids = (list: { id: string }[]) => list.map((row) => row.id)

describe('which versions go', () => {
  it('keeps everything under the caps', () => {
    expect(toPruneVersions([...rows(AUTO_LIMIT, 'auto'), ...rows(5, 'manual', 100)])).toEqual([])
  })

  /**
   * A named version is the one somebody chose to keep before a big change.
   * At one automatic copy a minute, a single cap shared with them would push
   * it off the end within half an hour of work.
   */
  it('prunes the oldest automatic copies first, and only to each other', () => {
    const named = rows(5, 'manual', 0)
    const automatic = rows(AUTO_LIMIT + 2, 'auto', 100)
    expect(ids(toPruneVersions([...automatic, ...named]))).toEqual(['auto100', 'auto101'])
  })

  it('applies the overall cap to what remains, oldest first', () => {
    expect(ids(toPruneVersions(rows(VERSION_LIMIT + 1, 'manual')))).toEqual(['manual0'])
  })

  it('treats a row from before origins existed as one somebody named', () => {
    const legacy = rows(3, undefined, 0)
    const automatic = rows(AUTO_LIMIT + 1, 'auto', 100)
    expect(ids(toPruneVersions([...legacy, ...automatic]))).toEqual(['auto100'])
  })
})
