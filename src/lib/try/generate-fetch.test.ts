import { beforeEach, describe, expect, it, vi } from 'vitest'

const track = vi.fn()
vi.mock('@/lib/analytics', () => ({ track: (...args: unknown[]) => track(...args) }))

import { setByokKey, getByokKey } from './byok-client'
import { OUT_OF_CREDITS_EVENT, noteGenerateRefusal, retryAfterSeconds } from './generate-fetch'

const refused = (status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ message: 'the body' }), { status, headers })

describe('reading a Retry-After', () => {
  it('is the number of seconds the route wrote', () => {
    expect(retryAfterSeconds('37')).toBe(37)
    expect(retryAfterSeconds(' 5 ')).toBe(5)
  })

  it('is nothing when the header is missing, zero or a date', () => {
    expect(retryAfterSeconds(null)).toBeNull()
    expect(retryAfterSeconds('0')).toBeNull()
    expect(retryAfterSeconds('Wed, 21 Oct 2026 07:28:00 GMT')).toBeNull()
  })
})

describe('what a refused generation does', () => {
  beforeEach(() => {
    track.mockClear()
    window.sessionStorage.clear()
    window.history.pushState({}, '', '/try')
  })

  /**
   * The regression this exists for: a 402 opened the out-of-credits sheet
   * and, on the same click, a toast reading "You are out of credits" over it.
   * The sheet is the answer; the caller needs to know it has been given.
   */
  it('opens the sheet on /try for a 402 and says so, so no toast is stacked on it', () => {
    const opened = vi.fn()
    window.addEventListener(OUT_OF_CREDITS_EVENT, opened)
    const refusal = noteGenerateRefusal(refused(402))
    window.removeEventListener(OUT_OF_CREDITS_EVENT, opened)

    expect(opened).toHaveBeenCalledTimes(1)
    expect(refusal).toEqual({ message: null, sheetOpened: true })
    expect(track).toHaveBeenCalledWith('pool_exhausted_shown')
  })

  it('leaves a 402 on the dashboard to the toast, where nothing listens', () => {
    window.history.pushState({}, '', '/dashboard')
    expect(noteGenerateRefusal(refused(402))).toEqual({ message: null, sheetOpened: false })
    expect(track).not.toHaveBeenCalled()
  })

  it('forgets a stored key Anthropic rejected', () => {
    setByokKey('sk-ant-api03-0123456789abcdefghijklmnop')
    expect(noteGenerateRefusal(refused(401)).message).toBe('Your Anthropic key was rejected')
    expect(getByokKey()).toBeNull()
  })

  /**
   * The regression this exists for: a 429 was a sentence with a number in it
   * that was wrong a second after it was read. The seconds travel on their
   * own so the toast can count them down.
   */
  it('turns a 429 with a Retry-After into a wait the toast can count', () => {
    expect(noteGenerateRefusal(refused(429, { 'Retry-After': '37' }))).toEqual({
      message: 'Too many requests',
      description: 'Try again in 37s',
      retryAfter: 37,
      sheetOpened: false,
    })
  })

  it('keeps the body of a 429 that carries no clock', () => {
    expect(noteGenerateRefusal(refused(429))).toEqual({ message: null, sheetOpened: false })
  })
})
