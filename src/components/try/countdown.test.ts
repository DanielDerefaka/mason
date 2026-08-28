import { describe, expect, it } from 'vitest'

import { formatCountdown, formatRoughCountdown } from './countdown'

const HOUR = 60 * 60_000
const MINUTE = 60_000

describe('formatCountdown', () => {
  it('reads hours and minutes when more than an hour remains', () => {
    expect(formatCountdown(3 * HOUR + 12 * MINUTE)).toBe('3h 12m')
  })

  it('drops the hours when under one', () => {
    expect(formatCountdown(42 * MINUTE)).toBe('42m')
  })

  it('rounds a partial minute up so the banner never says 0m while time remains', () => {
    expect(formatCountdown(30_000)).toBe('1m')
    expect(formatCountdown(HOUR + 1)).toBe('1h 1m')
  })

  it('says a moment once the reset time has passed', () => {
    expect(formatCountdown(0)).toBe('a moment')
    expect(formatCountdown(-5 * MINUTE)).toBe('a moment')
  })

  it('never shows 60m where it should show the next hour', () => {
    expect(formatCountdown(HOUR)).toBe('1h 0m')
    expect(formatCountdown(59 * MINUTE + 30_000)).toBe('1h 0m')
  })
})

describe('formatRoughCountdown', () => {
  it('rounds up to whole hours', () => {
    expect(formatRoughCountdown(2 * HOUR + 5 * MINUTE)).toBe('3h')
    expect(formatRoughCountdown(HOUR)).toBe('1h')
  })

  it('falls back to minutes inside the last hour', () => {
    expect(formatRoughCountdown(20 * MINUTE)).toBe('20m')
  })

  it('says a moment once the reset time has passed', () => {
    expect(formatRoughCountdown(0)).toBe('a moment')
  })
})
