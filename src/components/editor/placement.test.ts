import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  PLACEMENT_COPY,
  placementOf,
  placementWrites,
  movesByOffset,
  type Placement,
} from './placement'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')
const valueOf = (writes: [string, string][], property: string) =>
  writes.find(([name]) => name === property)?.[1]

describe('reading the placement off an element', () => {
  it('calls absolute and fixed free, because both have left the flow', () => {
    expect(placementOf('absolute')).toBe('free')
    expect(placementOf('fixed')).toBe('free')
  })

  it('calls relative an offset', () => {
    expect(placementOf('relative')).toBe('offset')
  })

  it('treats everything else as flow', () => {
    expect(placementOf('static')).toBe('flow')
    expect(placementOf('')).toBe('flow')
    expect(placementOf('sticky')).toBe('flow')
  })

  /**
   * What shipped broken if this regresses: judging the mode by whether the
   * offsets happen to be non-zero disables the X and Y inputs on an element
   * somebody has just put into offset mode, which are the only two controls
   * that mode exists to provide.
   */
  it('is still an offset at zero, so the inputs stay live', () => {
    expect(placementOf('relative')).toBe('offset')
  })

  it('reorders in the flow and moves everywhere else', () => {
    expect(movesByOffset('flow')).toBe(false)
    expect(movesByOffset('offset')).toBe(true)
    expect(movesByOffset('free')).toBe(true)
  })
})

describe('switching an element between placements', () => {
  const at = { offsetLeft: 412, offsetTop: 268 }

  /**
   * The subtle one, and the one that would look like the editor throwing the
   * design around. `absolute` offsets count from the containing block, so they
   * are seeded with where the element already is. `relative` offsets count from
   * the element's own normal position, so the same seed would move it 412px
   * right and 268px down the instant the mode changed.
   */
  it('seeds a free element where it already sits', () => {
    const writes = placementWrites('free', at)
    expect(valueOf(writes, 'position')).toBe('absolute')
    expect(valueOf(writes, 'left')).toBe('412px')
    expect(valueOf(writes, 'top')).toBe('268px')
  })

  it('seeds an offset element at zero rather than where it sits', () => {
    const writes = placementWrites('offset', at)
    expect(valueOf(writes, 'position')).toBe('relative')
    expect(valueOf(writes, 'left')).toBe('0px')
    expect(valueOf(writes, 'top')).toBe('0px')
  })

  /**
   * Clearing, not `static`. Returning to the flow means giving the element back
   * to the design's stylesheet, and writing `static` inline would override a
   * design that positioned the element deliberately.
   */
  it('clears the inline declarations on the way back into the flow', () => {
    const writes = placementWrites('flow', at)
    expect(valueOf(writes, 'position')).toBe('')
    expect(valueOf(writes, 'left')).toBe('')
    expect(valueOf(writes, 'top')).toBe('')
  })

  it('always writes all three, so no mode inherits a stale offset', () => {
    for (const mode of ['flow', 'offset', 'free'] as Placement[]) {
      const properties = placementWrites(mode, at).map(([name]) => name)
      expect(properties).toEqual(['position', 'left', 'top'])
    }
  })
})

/**
 * The copy is read by a visitor, so it is held to the same rule as the
 * marketing pages, and it has a job beyond being grammatical: the old wording
 * for free placement said it "no longer holds space in the layout", which is
 * true and does not warn anybody that the rest of the page is about to jump.
 */
describe('what the panel tells you a mode will do', () => {
  it('warns that free placement moves the rest of the page', () => {
    expect(PLACEMENT_COPY.free).toMatch(/moves up to fill the gap/)
  })

  it('promises that an offset does not', () => {
    expect(PLACEMENT_COPY.offset).toMatch(/nothing else on the page moves/)
  })

  it('carries no em dash', () => {
    for (const line of Object.values(PLACEMENT_COPY)) expect(line).not.toContain('—')
  })
})

/**
 * The wiring, pinned against the source. Every one of these is silently
 * breakable: the drag still works, and it works the old destructive way.
 */
describe('what the editor does with a placement', () => {
  const editor = () => read('src/components/editor/index.tsx')
  const panel = () => read('src/components/editor/properties.tsx')

  /**
   * Held down mid-drag, not read once at the start. The hint that appears
   * during a reorder invites you to press it while already dragging, so a
   * latched modifier would make that hint a lie.
   */
  it('reads the modifier off each pointer move rather than latching it', () => {
    const source = editor()
    const start = source.indexOf('const onMoveStart')
    const body = source.slice(start, source.indexOf('\n  const MIN_ZOOM', start))
    expect(body).toMatch(/move\.metaKey \|\| move\.ctrlKey/)
  })

  /**
   * A flow element lifted for a free drag becomes `relative`, never
   * `absolute`. Absolute is the one that empties the space it was holding, so
   * using it here would make every drag collapse the layout, which is the
   * complaint this whole mode exists to answer.
   */
  it('lifts a flow element with an offset rather than out of the document', () => {
    const source = editor()
    const start = source.indexOf('const beginMoving')
    expect(start).toBeGreaterThan(-1)
    const body = source.slice(start, source.indexOf('\n    const ', start + 10))
    expect(body).toContain("placementWrites('offset'")
    expect(body).not.toContain("'absolute'")
  })

  /** Arrow keys follow the drag: pixels once it is offset, order while in flow. */
  it('nudges an offset element by pixels instead of reordering it', () => {
    const source = editor()
    const start = source.indexOf('const onNudge')
    const body = source.slice(start, source.indexOf('\n  /** Adds an element', start))
    expect(body).toMatch(/placementOf\(/)
    expect(body).not.toMatch(/\['absolute', 'fixed'\]/)
  })

  it('offers all three modes in the properties panel', () => {
    const source = panel()
    expect(source).toMatch(/PLACEMENT_LABEL/)
    expect(source).toMatch(/PLACEMENT_COPY/)
  })

  /** The hint is the only thing that makes the modifier discoverable. */
  it('tells you about the modifier while you are dragging', () => {
    expect(editor()).toMatch(/to move it freely/)
  })
})
