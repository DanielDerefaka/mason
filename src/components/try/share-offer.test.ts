import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { shareBonusReason } from './share-offer'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('why the share bonus is not on offer', () => {
  it('has nothing to explain for an account, or for a guest who can still earn it', () => {
    expect(shareBonusReason(null)).toBeNull()
    expect(shareBonusReason({ shareClaimed: false, poolUses: 1 })).toBeNull()
  })

  it('says the bonus was already earned', () => {
    expect(shareBonusReason({ shareClaimed: true, poolUses: 3 })).toMatch(/already earned/)
  })

  it('says a design has to come first', () => {
    expect(shareBonusReason({ shareClaimed: false, poolUses: 0 })).toMatch(/Generate a design first/)
  })
})

/**
 * The regression this exists for: the sheet rendered the share row only
 * while `earnsBonus` was true, so a guest whose bonus was off saw the row
 * vanish with no word on why. The row is now offered to every guest, off
 * with its reason under it when it cannot be pressed.
 */
describe('the out-of-credits sheet keeps the share row', () => {
  const sheet = read('src/components/try/out-of-credits-sheet.tsx')

  it('offers the row to a guest whether or not the bonus is on', () => {
    expect(sheet).toMatch(/const offerShare = isGuest \|\| share\.earnsBonus/)
    expect(sheet).not.toMatch(/\{share\.earnsBonus && \(/)
  })

  it('prints the reason under a row that is off', () => {
    expect(sheet).toMatch(/share\.earnsBonus \? share\.disabledReason : share\.bonusReason/)
  })

  it('keeps its countdown moving while it is open', () => {
    expect(sheet).toMatch(/setInterval\(\(\) => setNow\(Date\.now\(\)\), 60_000\)/)
    expect(sheet).not.toMatch(/resetsAt - Date\.now\(\)/)
  })
})

/**
 * The regression this exists for: a refund took one off `poolUses`, the
 * count `canClaimShare` reads, so a design cut short and refunded, kept on
 * the canvas and worth sharing, left the guest unable to share it for the
 * bonus. `poolUses` counts turns taken and nothing reads it for
 * availability, which `lastPoolDay` alone decides, so the refund leaves it.
 */
describe('a refunded turn still counts as a design made', () => {
  it('does not take the turn back off the share count', () => {
    const credits = read('convex/credits.ts')
    expect(credits).not.toMatch(/poolUses: Math\.max\(0, guest\.poolUses - 1\)/)
    // The availability half of the refund is untouched.
    expect(credits).toMatch(/lastPoolDay: undefined,/)
  })
})
