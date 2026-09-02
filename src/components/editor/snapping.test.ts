import { describe, expect, it } from 'vitest'

import { SNAP_PX, sameGuides, snapDelta, type Guide, type Rect } from './snapping'

const rect = (left: number, top = 0, width = 100, height = 40): Rect => ({ left, top, width, height })

describe('snapDelta', () => {
  it('has nothing to pull against on an empty design', () => {
    expect(snapDelta(rect(10, 10), [])).toEqual({ dx: 0, dy: 0, guides: [] })
  })

  it('leaves a drag alone once it is further away than the threshold', () => {
    const result = snapDelta(rect(200, 200), [rect(0, 0)])
    expect(result).toEqual({ dx: 0, dy: 0, guides: [] })
  })

  it('pulls a left edge onto a left edge', () => {
    const result = snapDelta(rect(104, 300), [rect(100, 0)])
    expect(result.dx).toBe(-4)
    expect(result.dy).toBe(0)
    expect(result.guides).toEqual([{ axis: 'x', at: 100, from: 0, to: 340 }])
  })

  /** Centre matching is the whole reason this is not "nearest edge". */
  it('centres an element on another element', () => {
    // A 40-wide box whose centre lands 3px off the 200-wide box's centre.
    const result = snapDelta({ left: 83, top: 500, width: 40, height: 10 }, [rect(0, 0, 200, 50)])
    expect(result.dx).toBe(-3)
  })

  /**
   * Both axes at once, or dragging a card into a corner would line up its left
   * and leave its top three pixels out, which is worse than not snapping.
   */
  it('snaps both axes in the same move', () => {
    const result = snapDelta(rect(103, 202), [rect(100, 200)])
    expect([result.dx, result.dy]).toEqual([-3, -2])
    expect(result.guides.map((guide) => guide.axis)).toEqual(['x', 'y'])
  })

  /**
   * Enumerating candidates in document order and taking the first match makes
   * the snap depend on where a node sits in the markup, which reads as the
   * editor choosing at random between two things that are both in range.
   */
  it('takes the closest target rather than the first one it finds', () => {
    const result = snapDelta(rect(100, 500), [rect(96), rect(101)])
    expect(result.dx).toBe(1)
    expect(result.guides[0].at).toBe(101)
  })

  /** The segment has to cover both boxes, or it points at only one of them. */
  it('draws the guide across the element and the one it matched', () => {
    const result = snapDelta({ left: 100, top: 600, width: 50, height: 20 }, [rect(100, 0, 50, 20)])
    expect(result.guides[0]).toEqual({ axis: 'x', at: 100, from: 0, to: 620 })
  })

  /** The extent is measured after the pull, not before it. */
  it('measures the guide from where the element lands', () => {
    const result = snapDelta({ left: 100, top: 4, width: 50, height: 20 }, [rect(100, 0, 50, 20)])
    expect(result.dy).toBe(-4)
    expect(result.guides.find((guide) => guide.axis === 'x')).toEqual({ axis: 'x', at: 100, from: 0, to: 20 })
  })

  it('takes a threshold, because the editor divides it by the zoom', () => {
    expect(snapDelta(rect(120, 500), [rect(100)], SNAP_PX).dx).toBe(0)
    expect(snapDelta(rect(120, 500), [rect(100)], 40).dx).toBe(-20)
  })
})

describe('sameGuides', () => {
  const guide: Guide = { axis: 'x', at: 100, from: 0, to: 50 }

  it('is true for the overwhelmingly common case of nothing snapped', () => {
    expect(sameGuides([], [])).toBe(true)
  })

  it('is false when a line appears, moves or goes away', () => {
    expect(sameGuides([guide], [])).toBe(false)
    expect(sameGuides([guide], [{ ...guide, at: 101 }])).toBe(false)
    expect(sameGuides([guide], [{ ...guide, axis: 'y' }])).toBe(false)
  })

  /**
   * A guide that is holding while the element slides along it has to grow with
   * it. Comparing only the line would freeze the segment at whatever length it
   * had when the snap first took, and it would visibly stop following.
   */
  it('is false when only the extent has changed', () => {
    expect(sameGuides([guide], [{ ...guide, to: 90 }])).toBe(false)
  })
})
