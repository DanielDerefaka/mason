import { describe, expect, it } from 'vitest'

import { FRAME_PRESET_GROUPS } from './frame-presets'
import { arrowHeadFor, MAX_MODEL_EDGE, scaleFor } from './rasterise'

/**
 * The drawing itself needs a real canvas, which jsdom does not have; the two
 * decisions that do not are pinned here. `npm run smoke:browser` is where the
 * PNG is looked at.
 */

describe('scaleFor', () => {
  /**
   * The regression this exists for: every frame was rasterised at 2x, so the
   * Desktop preset went up as 2880 by 2048 and came back down to 1568 on the
   * far side, three times the upload for the same picture.
   */
  it('keeps every preset inside the edge the model actually looks at', () => {
    for (const preset of FRAME_PRESET_GROUPS.flatMap((group) => group.presets)) {
      const scale = scaleFor(preset)
      expect(Math.max(preset.width, preset.height) * scale).toBeLessThanOrEqual(MAX_MODEL_EDGE)
    }
  })

  it('lands the Desktop preset exactly on the edge', () => {
    expect(1440 * scaleFor({ width: 1440, height: 1024 })).toBeCloseTo(MAX_MODEL_EDGE)
  })

  // The phone presets are taller than 784, so they scale down a little too;
  // only a frame whose long edge is under half the ceiling affords the 2x.
  it('keeps 2x for a frame small enough to afford it', () => {
    expect(scaleFor({ width: 600, height: 400 })).toBe(2)
  })

  it('uses the long edge whichever way the frame is turned', () => {
    expect(scaleFor({ width: 1024, height: 1440 })).toBe(scaleFor({ width: 1440, height: 1024 }))
  })

  it('does not divide by an empty frame', () => {
    expect(scaleFor({ width: 0, height: 0 })).toBe(2)
  })
})

describe('arrowHeadFor', () => {
  it('points the way the last segment does, with the tip just past the end', () => {
    const head = arrowHeadFor([{ x: 0, y: 0 }, { x: 100, y: 0 }], 2)
    expect(head).not.toBeNull()
    const [apex, left, right] = head!
    // refX is 8 of 10 on a marker five stroke-widths long: one width past the tip.
    expect(apex).toEqual({ x: 102, y: 0 })
    expect(left.x).toBeCloseTo(92)
    expect(right.x).toBeCloseTo(92)
    expect(Math.abs(left.y - right.y)).toBeCloseTo(10)
  })

  it('follows the final segment of a bent path, not the whole path', () => {
    // Right, then straight down: the head points down.
    const head = arrowHeadFor([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], 2)!
    expect(head[0]).toEqual({ x: 100, y: 102 })
  })

  it('looks past the points a hand leaves on the tip when it stops before lifting', () => {
    const head = arrowHeadFor([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 0 }], 2)!
    expect(head[0]).toEqual({ x: 52, y: 0 })
  })

  it('grows with the stroke, the way the marker is sized in stroke units', () => {
    const thin = arrowHeadFor([{ x: 0, y: 0 }, { x: 100, y: 0 }], 1)!
    const thick = arrowHeadFor([{ x: 0, y: 0 }, { x: 100, y: 0 }], 4)!
    expect(Math.abs(thick[1].y - thick[2].y)).toBeCloseTo(4 * Math.abs(thin[1].y - thin[2].y))
  })

  it('has no head for a path with no direction', () => {
    expect(arrowHeadFor([], 2)).toBeNull()
    expect(arrowHeadFor([{ x: 5, y: 5 }], 2)).toBeNull()
    expect(arrowHeadFor([{ x: 5, y: 5 }, { x: 5, y: 5 }], 2)).toBeNull()
  })
})
