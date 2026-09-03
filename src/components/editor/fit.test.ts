import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { FIT_MARGIN, MAX_ZOOM, MIN_ZOOM, fitZoom } from './fit'

const source = readFileSync(resolve(process.cwd(), 'src/components/editor/index.tsx'), 'utf8')

/**
 * What shipped broken: the artboard took its width from whatever the two
 * panels left, about 680px, and a layout the model wrote for a desktop was
 * judged at a width it was never given. Three columns stacked, a headline
 * wrapped to a word a line, and every one of those read as the model's fault.
 * The design is laid out at its own width and scaled to fit the pane, so a
 * 1440px page in a 680px pane is that page smaller rather than that page
 * reflowed.
 */
describe('fitZoom', () => {
  it('scales a desktop design down to the pane', () => {
    expect(fitZoom(680, 1440)).toBeCloseTo((680 - FIT_MARGIN) / 1440, 5)
  })

  it('never enlarges a design that already fits', () => {
    expect(fitZoom(2000, 1440)).toBe(1)
  })

  it('stays inside the zoom range', () => {
    expect(fitZoom(100, 10000)).toBe(MIN_ZOOM)
    expect(MAX_ZOOM).toBeGreaterThan(1)
  })

  it('falls back to life size when there is nothing to measure', () => {
    expect(fitZoom(0, 1440)).toBe(1)
    expect(fitZoom(680, 0)).toBe(1)
  })
})

describe('the editor pane', () => {
  it('opens the design at the zoom that fits, laid out at its own width', () => {
    expect(source).toContain('fitZoom(view.clientWidth, design.width)')
    expect(source).toContain('style={{ width: design.width, transform: `scale(${zoom})` }}')
  })

  // One zoom range, not two: the buttons and the keyboard used to clamp
  // against a copy of these numbers declared inside the component.
  it('takes its zoom range from one place', () => {
    expect(source).toContain("from './fit'")
    expect(source).not.toMatch(/const MIN_ZOOM/)
  })

  // A transform leaves the layout box at the unscaled size, so the frame
  // around the artboard is what gives the pane something the right size to
  // scroll and centre.
  it('sizes the room the artboard takes to the zoom', () => {
    expect(source).toContain('width: design.width * zoom, height: stageHeight * zoom')
    expect(source).toContain('origin-top-left')
  })
})
