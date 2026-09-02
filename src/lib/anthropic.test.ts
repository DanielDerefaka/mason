import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The module builds two clients at import, and the raw SDK refuses to be
 * constructed under jsdom, so both are stubbed: only the effort parsing is
 * under test here.
 */
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: () => () => ({}) }))

const { uiEffortFrom } = await import('./anthropic')

describe('the effort a page is written at', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to high', () => {
    expect(uiEffortFrom(undefined)).toBe('high')
  })

  it('treats a blank variable as unset, not as a value', () => {
    // The trap this project has already fallen into once, with the guest
    // caps: `.env.example` lists every name with no value, and a copied line
    // that reads `ANTHROPIC_UI_EFFORT=` would otherwise hand the provider an
    // empty string, which its own validation rejects on every generation.
    expect(uiEffortFrom('')).toBe('high')
    expect(uiEffortFrom('   ')).toBe('high')
  })

  it.each(['low', 'medium', 'high', 'xhigh', 'max'])('passes %s through', (level) => {
    expect(uiEffortFrom(level)).toBe(level)
    expect(uiEffortFrom(` ${level} `)).toBe(level)
  })

  it('falls back to high on a value the provider would refuse, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(uiEffortFrom('hgih')).toBe('high')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('hgih')
  })
})
