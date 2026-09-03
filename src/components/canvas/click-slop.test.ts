import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { CLICK_SLOP_PX, isDrag, pressAt } from './click-slop'

/**
 * Selecting a frame moved it. A press starts a move at once and the first
 * pointermove went straight to the store; a hand is never perfectly still
 * and the snap pulled an edge onto a neighbour regardless, so a click wrote
 * the shape and flipped the header to "Unsaved changes".
 */
describe('a click is not a drag', () => {
  it('holds the moves a hand makes while clicking', () => {
    const press = pressAt(100, 100)
    expect(isDrag(press, 101, 99)).toBe(false)
    expect(isDrag(press, 100 + CLICK_SLOP_PX, 100 - CLICK_SLOP_PX)).toBe(false)
  })

  it('becomes a drag one pixel past the slop, on either axis', () => {
    expect(isDrag(pressAt(100, 100), 100 + CLICK_SLOP_PX + 1, 100)).toBe(true)
    expect(isDrag(pressAt(100, 100), 100, 100 - CLICK_SLOP_PX - 1)).toBe(true)
  })

  it('stays a drag when the pointer passes back through where it started', () => {
    const press = pressAt(0, 0)
    isDrag(press, 20, 0)
    expect(isDrag(press, 1, 0)).toBe(true)
  })
})

describe('the canvas honours it', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/canvas/index.tsx'), 'utf8')

  it('records the press in the capture phase, before a shape stops the event', () => {
    expect(source).toContain('onPointerDownCapture={onPressCapture}')
  })

  it('keeps moves from the gesture handlers until the press is a drag', () => {
    expect(source).toContain('onPointerMove={onMoveUnlessClick}')
    expect(source).not.toMatch(/onPointerMove=\{onPointerMove\}/)
  })
})
