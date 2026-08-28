import { describe, expect, it } from 'vitest'

import { asGuest, isAccount, type GuestMe } from './types'

/**
 * The regression these exist for: /try decided who it was talking to with
 * `'bonus' in me`, and `api.guest.me` answers a real account with a
 * zero-filled shape carrying every guest field. Every signed-in user was
 * therefore rendered as a guest — pill reading "0 credits", no way back to
 * the dashboard, and the pool banner addressing them as if they had used
 * their free turn.
 */
const guest: GuestMe = {
  isGuest: true,
  bonus: 2,
  poolAvailable: true,
  poolUsedToday: false,
  poolUses: 0,
  shareClaimed: false,
  canClaimShare: false,
  keyAdded: false,
}

const account: GuestMe = { ...guest, isGuest: false, bonus: 0, poolAvailable: false }

describe('who is on the free canvas', () => {
  it('reads a real account as an account even though it carries the guest fields', () => {
    expect(asGuest(account)).toBeNull()
    expect(isAccount(account)).toBe(true)
  })

  it('reads a guest as a guest', () => {
    expect(asGuest(guest)).toBe(guest)
    expect(isAccount(guest)).toBe(false)
  })

  it('commits to neither before the query has answered', () => {
    expect(asGuest(undefined)).toBeNull()
    expect(isAccount(undefined)).toBe(false)
    expect(asGuest(null)).toBeNull()
    expect(isAccount(null)).toBe(false)
  })
})
