import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { accountCredits, guestCredits } from './credits-label'

/**
 * The regression this exists for: the pill read "1 pool + 1 credit". Nobody
 * outside the codebase calls the free turn a pool, and the plus made two
 * different things look like a sum. Each state now reads as a sentence.
 */
describe('the credits pill', () => {
  it('names the free turn on its own', () => {
    expect(guestCredits({ poolAvailable: true, bonus: 0 })).toBe('1 free turn today')
  })

  it('lists the free turn and earned credits, rather than adding them', () => {
    expect(guestCredits({ poolAvailable: true, bonus: 1 })).toBe('1 free turn today, 1 credit')
    expect(guestCredits({ poolAvailable: true, bonus: 3 })).toBe('1 free turn today, 3 credits')
  })

  it('shows credits alone once the turn is spent', () => {
    expect(guestCredits({ poolAvailable: false, bonus: 2 })).toBe('2 credits')
  })

  it('says there is nothing left today, rather than showing a zero', () => {
    expect(guestCredits({ poolAvailable: false, bonus: 0 })).toBe('No turns left today')
  })

  it('never says pool, and never adds', () => {
    for (const poolAvailable of [true, false]) {
      for (const bonus of [0, 1, 5]) {
        const label = guestCredits({ poolAvailable, bonus })
        expect(label).not.toMatch(/pool|\+/)
      }
    }
  })

  it('shows an account its balance, and a placeholder until it is known', () => {
    expect(accountCredits(undefined)).toBe('…')
    expect(accountCredits(null)).toBe('…')
    expect(accountCredits(1)).toBe('1 credit')
    expect(accountCredits(12)).toBe('12 credits')
  })

  it('is what the header renders', () => {
    const header = readFileSync(join(process.cwd(), 'src/components/try/header.tsx'), 'utf8')
    expect(header).toContain('guestCredits(')
    expect(header).toContain('accountCredits(')
    expect(header).not.toContain("'1 pool'")
  })
})
