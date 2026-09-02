import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DATAFAST_NAME, EVENTS, identify, track } from './analytics'

/**
 * The helper between a call site and whatever analytics the page runs.
 *
 * What it protects: `track` is called from inside a generation, a pointer-up
 * and a sign-in, and none of those may fail because a script tag has not
 * loaded, a provider threw, or the code ran on the server. And a name is a
 * contract with two dashboards, so a typo is caught here rather than by a
 * chart that stays empty.
 */

type ProviderWindow = Window & {
  posthog?: { capture?: unknown; identify?: unknown; __loaded?: boolean }
  datafast?: unknown
}
const page = window as ProviderWindow

afterEach(() => {
  delete page.posthog
  delete page.datafast
  vi.unstubAllGlobals()
})

describe('track', () => {
  it('is a no-op on a page with no analytics', () => {
    expect(() => track('generate_clicked')).not.toThrow()
    expect(() => identify('user')).not.toThrow()
  })

  it('is safe to call where there is no window', () => {
    vi.stubGlobal('window', undefined)
    expect(() => track('generate_clicked')).not.toThrow()
    expect(() => identify('user')).not.toThrow()
  })

  it('hands DataFast the goal and its properties as strings within its limits', () => {
    const datafast = vi.fn()
    page.datafast = datafast
    track('generation_failed', {
      status: 402,
      'Not A Key': 'dropped',
      reason: undefined,
      ok: true,
      long: 'x'.repeat(300),
    })
    expect(datafast).toHaveBeenCalledWith('generation_failed', {
      status: '402',
      ok: 'true',
      long: 'x'.repeat(255),
    })
  })

  it('hands PostHog the event through the instance on the page', () => {
    const capture = vi.fn()
    const identifyFn = vi.fn()
    page.posthog = { capture, identify: identifyFn }
    track('share_created', { via: 'editor' })
    identify('user_1')
    expect(capture).toHaveBeenCalledWith('share_created', { via: 'editor' })
    expect(identifyFn).toHaveBeenCalledWith('user_1')
  })

  /**
   * The SDK drops a capture that arrives before `init` and prints a warning.
   * With the SDK loaded lazily, an event fired on mount is exactly that case.
   */
  it('waits for a PostHog that has not finished initialising rather than dropping the event', async () => {
    const capture = vi.fn()
    const instance = { capture, identify: vi.fn(), __loaded: false }
    page.posthog = instance
    track('signup_viewed')
    expect(capture).not.toHaveBeenCalled()
    instance.__loaded = true
    await vi.waitFor(() => expect(capture).toHaveBeenCalledWith('signup_viewed', undefined), {
      timeout: 2000,
    })
  })

  /**
   * The npm build of posthog-js never assigns `window.posthog`, so in
   * production this is the path every event takes.
   */
  it('reaches the SDK singleton by dynamic import when a key is set and nothing is on window', async () => {
    const capture = vi.fn()
    const identifyFn = vi.fn()
    vi.resetModules()
    vi.doMock('@/lib/posthog', () => ({ posthogEnabled: true }))
    vi.doMock('posthog-js', () => ({ default: { capture, identify: identifyFn, __loaded: true } }))
    try {
      const fresh = await import('./analytics')
      fresh.track('generate_clicked')
      fresh.identify('user_1')
      await vi.waitFor(() => expect(capture).toHaveBeenCalledWith('generate_clicked', undefined))
      await vi.waitFor(() => expect(identifyFn).toHaveBeenCalledWith('user_1'))
    } finally {
      vi.doUnmock('@/lib/posthog')
      vi.doUnmock('posthog-js')
      vi.resetModules()
    }
  })

  it('does not import the SDK when no key is set', async () => {
    const capture = vi.fn()
    vi.resetModules()
    vi.doMock('posthog-js', () => ({ default: { capture, identify: vi.fn(), __loaded: true } }))
    try {
      const fresh = await import('./analytics')
      fresh.track('generate_clicked')
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(capture).not.toHaveBeenCalled()
    } finally {
      vi.doUnmock('posthog-js')
      vi.resetModules()
    }
  })

  it('never lets a provider that throws take the caller down', () => {
    page.datafast = () => {
      throw new Error('datafast is broken')
    }
    page.posthog = {
      capture: () => {
        throw new Error('posthog is broken')
      },
      identify: () => {
        throw new Error('posthog is broken')
      },
    }
    expect(() => track('export_clicked')).not.toThrow()
    expect(() => identify('user')).not.toThrow()
  })
})

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : []
  })

describe('the event registry', () => {
  it('names every event the way DataFast requires a goal to be named', () => {
    for (const name of EVENTS) expect(name).toMatch(DATAFAST_NAME)
    expect(new Set(EVENTS).size).toBe(EVENTS.length)
  })

  /**
   * Read from disk rather than trusted to the type: `track('x' as EventName)`
   * compiles, and a name built at runtime never meets the union at all. The
   * converse is checked too, so the registry lists only what actually fires.
   */
  it('is the only source of a name a call site uses, and lists nothing that never fires', () => {
    const root = join(process.cwd(), 'src')
    const calls = sourceFiles(root).flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/\btrack\(\s*'([^']*)'/g)].map((match) => ({
        file: path.slice(path.indexOf('src/')),
        name: match[1],
      })),
    )
    expect(calls.length).toBeGreaterThan(0)

    const registered = new Set<string>(EVENTS)
    expect(calls.filter((call) => !registered.has(call.name))).toEqual([])

    const fired = new Set(calls.map((call) => call.name))
    expect(EVENTS.filter((name) => !fired.has(name))).toEqual([])
  })
})
