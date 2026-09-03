import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Shape } from '@/redux/slice/shapes'

import { FRAME_PRESET_GROUPS } from './frame-presets'
import {
  arrowHeadFor,
  MAX_MODEL_EDGE,
  PLACEHOLDER_WORD,
  rasteriseFrame,
  rasteriseFrameWithReport,
  scaleFor,
  wrapText,
} from './rasterise'

/**
 * The drawing needs a real canvas to be looked at, which jsdom does not have;
 * `npm run smoke:browser` is where the PNG is seen. What is asked of the
 * canvas can still be checked: the tests further down hand the rasteriser a
 * context that records every call and measures text at ten pixels a
 * character, so where a line breaks and what stands in for a missing image
 * are pinned without a pixel being painted.
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

describe('wrapText', () => {
  const tenPerChar = (run: string) => run.length * 10

  /**
   * The regression this exists for: a paragraph typed into a 240px text box
   * was drawn with one `fillText` per line break, so it ran across whatever
   * stood to its right and the model read a layout the drawer never saw.
   */
  it('wraps at a space when the next word would not fit the box', () => {
    expect(wrapText('aaaa bbbb cccc dddd', 100, tenPerChar)).toEqual(['aaaa bbbb', 'cccc dddd'])
  })

  it('fits a line that exactly fills the box', () => {
    expect(wrapText('aaaa bbbb', 90, tenPerChar)).toEqual(['aaaa bbbb'])
  })

  it("keeps the drawer's own line breaks, blank lines included", () => {
    expect(wrapText('one\n\ntwo', 100, tenPerChar)).toEqual(['one', '', 'two'])
  })

  it('lets a word wider than the box run over, as the canvas does, rather than losing it', () => {
    expect(wrapText('abcdefghijklmnop q', 50, tenPerChar)).toEqual(['abcdefghijklmnop', 'q'])
  })

  it('is one empty line for an empty run', () => {
    expect(wrapText('', 100, tenPerChar)).toEqual([''])
  })
})

type Call = [string, ...unknown[]]

/** A 2D context that records what is asked of it and measures text at ten pixels a character. */
const recordingContext = () => {
  const calls: Call[] = []
  const ctx: Record<string, unknown> = {
    calls,
    letterSpacing: '',
    measureText: (run: string) => ({ width: run.length * 10 }),
  }
  for (const method of [
    'save',
    'restore',
    'clip',
    'fill',
    'stroke',
    'beginPath',
    'closePath',
    'moveTo',
    'lineTo',
    'arcTo',
    'ellipse',
    'fillRect',
    'strokeRect',
    'scale',
    'translate',
    'drawImage',
    'fillText',
  ]) {
    ctx[method] = (...args: unknown[]) => {
      calls.push([method, ...args])
    }
  }
  return ctx as typeof ctx & { calls: Call[] }
}

/** Loads anything whose URL does not say "missing", a tick later like the real one. */
class FakeImage {
  crossOrigin = ''
  naturalWidth = 800
  naturalHeight = 600
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(value: string) {
    queueMicrotask(() => (value.includes('missing') ? this.onerror?.() : this.onload?.()))
  }
}

const FRAME: Shape = {
  id: 'frame',
  kind: 'frame',
  x: 0,
  y: 0,
  width: 1440,
  height: 1024,
  fill: 'transparent',
  label: 'Desktop',
}

const image = (id: string, src: string | undefined): Shape => ({
  id,
  kind: 'image',
  x: 100,
  y: 100,
  width: 400,
  height: 300,
  fill: 'transparent',
  src,
})

describe('rasteriseFrameWithReport', () => {
  let ctx: ReturnType<typeof recordingContext>

  beforeEach(() => {
    ctx = recordingContext()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      (() => ctx) as unknown as HTMLCanvasElement['getContext'],
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['png'], { type: 'image/png' }))
    })
    vi.stubGlobal('Image', FakeImage)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const drawn = (method: string) => ctx.calls.filter(([name]) => name === method)

  /**
   * The regression this exists for: an image whose URL failed resolved to
   * null and was skipped, so the picture had a hole where the manifest listed
   * an image, and nobody was told.
   */
  it('draws a placeholder where an image failed to load, and counts it', async () => {
    const { blob, missingImages } = await rasteriseFrameWithReport(FRAME, [
      FRAME,
      image('broken', 'https://files.test/missing.png'),
    ])
    expect(blob).toBeInstanceOf(Blob)
    expect(missingImages).toBe(1)
    expect(drawn('drawImage')).toHaveLength(0)
    // The word, centred in the box, and the diagonal from corner to corner.
    expect(ctx.calls).toContainEqual(['fillText', PLACEHOLDER_WORD, 300, 250])
    expect(ctx.calls).toContainEqual(['moveTo', 100, 100])
    expect(ctx.calls).toContainEqual(['lineTo', 500, 400])
  })

  it('draws the picture and counts nothing when it loads', async () => {
    const { missingImages } = await rasteriseFrameWithReport(FRAME, [
      FRAME,
      image('ok', 'https://files.test/ok.png'),
    ])
    expect(missingImages).toBe(0)
    expect(drawn('drawImage')).toHaveLength(1)
    expect(drawn('fillText')).toHaveLength(0)
  })

  it('counts a file that failed, not a box that never had one', async () => {
    const { missingImages } = await rasteriseFrameWithReport(FRAME, [
      FRAME,
      image('empty', undefined),
      image('broken', 'https://files.test/missing.png'),
      image('ok', 'https://files.test/ok.png'),
    ])
    expect(missingImages).toBe(1)
    // Both the empty box and the failed one are marked as images for the model.
    expect(drawn('fillText').filter(([, word]) => word === PLACEHOLDER_WORD)).toHaveLength(2)
  })

  /**
   * The regression this exists for: `fillText` once per line break, so a
   * paragraph in a 240px box crossed its neighbours in the picture.
   */
  it('wraps a text shape to its box, the way the canvas shows it', async () => {
    const paragraph = 'The quick brown fox jumps over the lazy dog and keeps on running'
    const text: Shape = {
      id: 'para',
      kind: 'text',
      x: 100,
      y: 100,
      width: 240,
      height: 80,
      fill: 'transparent',
      label: paragraph,
      text: { fontSize: 16 },
    }
    await rasteriseFrameWithReport(FRAME, [FRAME, text])

    const lines = drawn('fillText')
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.map(([, line]) => line)).toEqual(wrapText(paragraph, 240, (run) => run.length * 10))
    // Each line steps down by the line height, from the top of the box plus
    // the half-leading the browser puts above the first line.
    const lineHeight = 16 * 1.2
    lines.forEach(([, , x, y], index) => {
      expect(x).toBe(100)
      expect(y).toBeCloseTo(100 + (lineHeight - 16) / 2 + index * lineHeight)
    })
  })

  it('still hands back the blob alone through rasteriseFrame, for the export', async () => {
    await expect(rasteriseFrame(FRAME, [FRAME])).resolves.toBeInstanceOf(Blob)
  })
})
