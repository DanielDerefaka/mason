import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const bearer = vi.fn<() => Promise<string | null>>()

vi.mock('@convex-dev/auth/nextjs/server', () => ({
  convexAuthNextjsToken() {
    return bearer()
  },
}))

import { checkRateLimit } from './rate-limit'

const drain = async (bucket: 'generation' | 'edit', times: number) => {
  for (let index = 0; index < times; index += 1) {
    expect(await checkRateLimit(bucket)).toEqual({ ok: true })
  }
}

describe('the ceiling on generation requests', () => {
  let session = 0

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T10:00:00Z'))
    // A fresh token per test: the buckets are module state, and a test that
    // inherits another's count is testing the order of the file.
    session += 1
    bearer.mockResolvedValue(`session-${session}`)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('takes eight page generations in a minute and refuses the ninth', async () => {
    await drain('generation', 8)
    expect(await checkRateLimit('generation')).toEqual({ ok: false, retryAfter: 60 })
  })

  it('says how long the wait is, and it shrinks', async () => {
    await drain('generation', 8)
    vi.advanceTimersByTime(23_000)
    expect(await checkRateLimit('generation')).toEqual({ ok: false, retryAfter: 37 })
  })

  it('opens again once the minute has passed', async () => {
    await drain('generation', 8)
    vi.advanceTimersByTime(60_000)
    expect(await checkRateLimit('generation')).toEqual({ ok: true })
  })

  /**
   * The regression this exists for: the editor's element edits and the
   * canvas's page generations shared one bucket of eight, so two generations
   * and six headings reworded in the editor were refused the seventh edit
   * with "Too many requests", mid-session, for doing what the editor is for.
   */
  it('counts editing an element apart from generating a page', async () => {
    await drain('generation', 8)
    expect(await checkRateLimit('edit')).toEqual({ ok: true })
  })

  it('gives edits more room, because each is seconds of model time', async () => {
    await drain('edit', 20)
    expect(await checkRateLimit('edit')).toEqual({ ok: false, retryAfter: 60 })
    expect(await checkRateLimit('generation')).toEqual({ ok: true })
  })

  it('is the generation allowance when no bucket is named', async () => {
    await drain('generation', 8)
    expect(await checkRateLimit()).toEqual({ ok: false, retryAfter: 60 })
  })

  it('lets a request with no session through for the middleware to refuse', async () => {
    bearer.mockResolvedValue(null)
    await drain('generation', 9)
  })
})
