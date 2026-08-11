import { describe, expect, it } from 'vitest'

import { isDevicePresetName } from './frame-presets'

/**
 * The frame's label is sent to the model, and a device name is not a
 * description of anything. Left unfiltered it read as `a sketch of "MacBook
 * Air"`, and the model designed a MacBook Air product page — from any sketch,
 * against any reference. Every design made in a laptop-sized frame came out
 * about laptops, which looked like the model ignoring the reference when it was
 * really following the instruction it was given.
 */
describe('isDevicePresetName', () => {
  it.each([
    'MacBook Air',
    'MacBook Pro 14',
    'iPhone 16',
    'iPhone 16 Pro Max',
    'Desktop',
    'macbook air',
    '  MacBook Air  ',
  ])('treats %s as a size, not a subject', (label) => {
    expect(isDevicePresetName(label)).toBe(true)
  })

  it('treats a numbered duplicate as a size too', () => {
    // Frames are numbered as they are added, so the second one is "iPhone 16 2".
    expect(isDevicePresetName('iPhone 16 2')).toBe(true)
    expect(isDevicePresetName('Frame 3')).toBe(true)
  })

  it('treats an empty label as nothing to say', () => {
    expect(isDevicePresetName('')).toBe(true)
    expect(isDevicePresetName('   ')).toBe(true)
  })

  it.each(['Pricing page', 'Checkout', 'Plant care dashboard', 'Waitlist'])(
    'keeps %s, which someone actually chose',
    (label) => {
      expect(isDevicePresetName(label)).toBe(false)
    },
  )

  it('does not swallow a real name that merely contains a device word', () => {
    expect(isDevicePresetName('MacBook accessories store')).toBe(false)
  })
})
