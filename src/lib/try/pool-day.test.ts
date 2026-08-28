import { describe, expect, it } from 'vitest'

import { dayKey, nextResetAt } from './pool-day'

/**
 * The pool is "20 a day", and every guest, every banner and every Convex
 * mutation must agree on what "a day" is — or one guest's "today" would be
 * another's "yesterday" and the pool could be drawn twice. These pin the
 * boundary to UTC midnight, to the millisecond.
 */
const T = (iso: string) => Date.parse(iso)

describe('dayKey', () => {
  it('names the UTC calendar day as YYYY-MM-DD', () => {
    expect(dayKey(T('2026-08-28T13:45:00.000Z'))).toBe('2026-08-28')
  })

  it('pads single-digit months and days, so keys sort as strings', () => {
    expect(dayKey(T('2026-01-05T00:00:00.000Z'))).toBe('2026-01-05')
  })

  it('keeps the last millisecond of a day in that day', () => {
    expect(dayKey(T('2026-08-28T23:59:59.999Z'))).toBe('2026-08-28')
  })

  it('rolls over exactly at midnight UTC', () => {
    expect(dayKey(T('2026-08-29T00:00:00.000Z'))).toBe('2026-08-29')
  })

  it('ignores the local timezone entirely', () => {
    // Late evening in the Americas is already tomorrow in UTC; the key must
    // follow UTC whatever machine computes it.
    expect(dayKey(T('2026-08-28T23:30:00.000-05:00'))).toBe('2026-08-29')
  })

  it('defaults to the present moment', () => {
    expect(dayKey()).toBe(new Date().toISOString().slice(0, 10))
  })
})

describe('nextResetAt', () => {
  it('is the next midnight UTC after a mid-day instant', () => {
    expect(nextResetAt(T('2026-08-28T13:45:00.000Z'))).toBe(T('2026-08-29T00:00:00.000Z'))
  })

  it('is one millisecond away at 23:59:59.999Z', () => {
    const lastMoment = T('2026-08-28T23:59:59.999Z')
    expect(nextResetAt(lastMoment)).toBe(lastMoment + 1)
  })

  it('is a full day away at exactly midnight, since that midnight has already reset', () => {
    expect(nextResetAt(T('2026-08-29T00:00:00.000Z'))).toBe(T('2026-08-30T00:00:00.000Z'))
  })

  it('crosses month and year ends correctly', () => {
    expect(nextResetAt(T('2026-12-31T18:00:00.000Z'))).toBe(T('2027-01-01T00:00:00.000Z'))
  })

  it('always lands on the day after dayKey says it is', () => {
    const instants = [
      T('2026-02-28T12:00:00.000Z'),
      T('2028-02-29T23:59:59.999Z'),
      T('2026-08-28T00:00:00.001Z'),
    ]
    for (const now of instants) {
      const reset = nextResetAt(now)
      expect(reset).toBeGreaterThan(now)
      expect(reset - now).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
      expect(dayKey(reset)).not.toBe(dayKey(now))
      expect(dayKey(reset - 1)).toBe(dayKey(now))
    }
  })
})
