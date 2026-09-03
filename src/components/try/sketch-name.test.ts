import { describe, expect, it } from 'vitest'

import { sketchName } from './sketch-name'

const project = (shapes: unknown[] | undefined, name = 'My sketch') => ({
  name,
  sketchesData: shapes === undefined ? undefined : { shapes, viewport: null, frameCounter: 0 },
})

/**
 * The regression this exists for: every /try project is created as "My
 * sketch" and nothing renames it, so a visitor's third day offered a menu of
 * three identical names. The sketch names itself from what is drawn on it.
 */
describe('naming a sketch for the menu', () => {
  it('uses the instruction typed on a frame', () => {
    const shapes = [{ kind: 'frame', label: 'iPhone 16', instruction: 'A login screen with a magic link' }]
    expect(sketchName(project(shapes))).toBe('A login screen with a magic link')
  })

  it('takes the first instructed frame, not the first frame', () => {
    const shapes = [
      { kind: 'frame', label: 'iPhone 16' },
      { kind: 'frame', label: 'MacBook Air', instruction: 'Pricing page' },
    ]
    expect(sketchName(project(shapes))).toBe('Pricing page')
  })

  it('falls back to a frame label that is a name rather than a size', () => {
    const shapes = [
      { kind: 'frame', label: 'iPhone 16' },
      { kind: 'frame', label: 'Frame 2' },
      { kind: 'frame', label: 'Onboarding' },
    ]
    expect(sketchName(project(shapes))).toBe('Onboarding')
  })

  it('prefers an instruction to a label, whichever frame came first', () => {
    const shapes = [
      { kind: 'frame', label: 'Onboarding' },
      { kind: 'frame', label: 'Frame 2', instruction: 'Settings' },
    ]
    expect(sketchName(project(shapes))).toBe('Settings')
  })

  it('keeps the stored name for a sketch with nothing said on it', () => {
    expect(sketchName(project([{ kind: 'frame', label: 'iPhone 16' }]))).toBe('My sketch')
    expect(sketchName(project([{ kind: 'rectangle' }]))).toBe('My sketch')
    expect(sketchName(project([]))).toBe('My sketch')
  })

  /** Production rows made before this carry a name and whatever data they had. */
  it('survives a project with no sketch data, or data of another shape', () => {
    expect(sketchName(project(undefined))).toBe('My sketch')
    expect(sketchName({ name: 'My sketch', sketchesData: null })).toBe('My sketch')
    expect(sketchName({ name: 'My sketch', sketchesData: { shapes: 'nope' } })).toBe('My sketch')
    expect(sketchName({ name: 'My sketch', sketchesData: { shapes: [null, 3] } })).toBe('My sketch')
  })

  it('ignores an instruction that is only whitespace', () => {
    const shapes = [{ kind: 'frame', label: 'Checkout', instruction: '   ' }]
    expect(sketchName(project(shapes))).toBe('Checkout')
  })

  it('folds a paragraph to one line and cuts it where a row would', () => {
    const instruction =
      'A dashboard for a fleet of delivery vans,\n  with a map on the left and a list of stops on the right'
    const name = sketchName(project([{ kind: 'frame', instruction }]))

    expect(name).not.toMatch(/\n|  /)
    expect(name.length).toBeLessThanOrEqual(48)
    expect(name.endsWith('…')).toBe(true)
  })
})
