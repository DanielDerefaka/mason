import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { poolBannerLine, type PoolBannerState } from './pool-banner-line'

const state = (patch: Partial<PoolBannerState> = {}): PoolBannerState => ({
  remaining: 17,
  size: 20,
  resetsIn: 3 * 60 * 60_000,
  guestSpent: false,
  canClaimShare: false,
  inFlight: false,
  ...patch,
})

describe('the pool banner', () => {
  it('counts the pool while the guest still has a turn', () => {
    expect(poolBannerLine(state())).toBe('Community pool · 17 of 20 free generations left today')
  })

  /**
   * The regression this exists for: the turn is charged at the click and
   * the design lands eighty seconds later, and for all of that the banner
   * read "You've used your free generation today" over a canvas with
   * nothing new on it.
   */
  it('says the design is on its way rather than that the turn is gone', () => {
    expect(poolBannerLine(state({ guestSpent: true, inFlight: true }))).toBe(
      'Your free generation is on its way.',
    )
  })

  it('says the turn is spent once the design has landed', () => {
    expect(poolBannerLine(state({ guestSpent: true, canClaimShare: true }))).toMatch(
      /^You've used your free generation today\. Share on X for 2 more/,
    )
    expect(poolBannerLine(state({ guestSpent: true }))).toMatch(/Add your key to keep going\.$/)
  })

  it('puts the guest\'s own design ahead of the empty pool while it is on its way', () => {
    expect(poolBannerLine(state({ remaining: 0, guestSpent: true, inFlight: true }))).toBe(
      'Your free generation is on its way.',
    )
    expect(poolBannerLine(state({ remaining: 0, guestSpent: true }))).toMatch(/^The pool is used up/)
  })

  it('does not hold the line for a design the pool is not paying for', () => {
    // A visitor with their own key: nothing of theirs is being spent.
    expect(poolBannerLine(state({ inFlight: true }))).toMatch(/^Community pool/)
  })
})

describe('the banner reads the canvas', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/try/pool-banner.tsx'),
    'utf8',
  )

  it('asks the store whether a design is streaming, through the adapter', () => {
    expect(source).toMatch(/shapesAdapter\.getSelectors\(\)/)
    expect(source).toMatch(/shape\.streaming === true/)
  })

  it('leaves a design written on the visitor\'s own key out of it', () => {
    expect(source).toMatch(/!keyStored/)
  })
})
