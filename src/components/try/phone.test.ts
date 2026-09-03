import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PhoneScreen } from './phone-screen'
import { PHONE_QUERY, usePhone } from './use-phone'

// React wants to be told it is being driven by `act` rather than a browser.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

type Device = { width: number; coarse: boolean }

/**
 * jsdom has no matchMedia. The stub answers the way a browser would, feature
 * by feature, so what is under test is the query the hook really asks and
 * not a canned yes. A comma is "or" and `and` is "and", as in CSS.
 */
const matches = (query: string, device: Device) =>
  query.split(',').some((part) =>
    part.split(/\band\b/).every((feature) => {
      const width = /max-width:\s*(\d+)px/.exec(feature)
      if (width) return device.width <= Number(width[1])
      if (/pointer:\s*coarse/.test(feature)) return device.coarse
      throw new Error(`the stub does not know ${feature.trim()}`)
    }),
  )

/** Every value the hook returned, first render first. */
const observe = async (device: Device) => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: matches(query, device), media: query }))
  const seen: (boolean | undefined)[] = []
  const Probe = () => {
    seen.push(usePhone())
    return null
  }
  const host = document.createElement('div')
  const root = createRoot(host)
  await act(async () => root.render(createElement(Probe)))
  await act(async () => root.unmount())
  return seen
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('what counts as a phone', () => {
  it('asks about the width and the pointer, in one query', () => {
    expect(PHONE_QUERY).toContain('(max-width: 767px)')
    expect(PHONE_QUERY).toContain('(pointer: coarse)')
  })

  /**
   * The regression this exists for: nothing under /try branched on either,
   * so a phone was handed a `touch-none` canvas and a hint that said
   * "press F". Half of paid and social traffic arrives on one.
   */
  it('is a phone below 768px, even with a mouse', async () => {
    expect((await observe({ width: 767, coarse: false })).at(-1)).toBe(true)
  })

  // Sideways is still a phone: up to 932px wide and nothing finer than a
  // thumb to draw with.
  it('is a phone on a touch screen below 1024px, whichever way it is held', async () => {
    expect((await observe({ width: 932, coarse: true })).at(-1)).toBe(true)
    expect((await observe({ width: 820, coarse: true })).at(-1)).toBe(true)
  })

  /**
   * What shipped broken: the touch half of the query had no width on it, and
   * `(pointer: coarse)` alone is every iPad ever made. An iPad Pro with a
   * keyboard and a trackpad was told at 1366px wide to find a bigger screen.
   */
  it('is not a phone for being a touch screen: an iPad in landscape keeps the canvas', async () => {
    expect((await observe({ width: 1024, coarse: true })).at(-1)).toBe(false)
    expect((await observe({ width: 1366, coarse: true })).at(-1)).toBe(false)
  })

  it('is a desktop from 768px with a mouse', async () => {
    expect((await observe({ width: 768, coarse: false })).at(-1)).toBe(false)
  })

  /**
   * The third value. The shell mounts the guest gate only once this is known,
   * because the gate mints a session in its first effect: a hook that guessed
   * "desktop" on the first render would have the session opened before the
   * width arrived, which is the allowance a phone was burning.
   */
  it('knows nothing on the first render, so nothing above it can mint yet', async () => {
    const seen = await observe({ width: 390, coarse: true })
    expect(seen[0]).toBeUndefined()
    expect(seen.at(-1)).toBe(true)
  })
})

describe('the shell', () => {
  const shell = read('src/components/try/shell.tsx')

  /**
   * Read from the source, for the reason guest-gate.test.ts gives: what is
   * under test is a call that must not happen. The gate has to come after the
   * device is settled, in the code as well as in time.
   */
  it('settles the device before the gate exists', () => {
    expect(shell).toContain('const phone = usePhone()')
    const unknown = shell.indexOf('if (phone === undefined)')
    const screen = shell.indexOf('if (phone) return <PhoneScreen />')
    // The tag, not the whole opening: what is pinned is where the gate sits,
    // and a prop added to it later is not this test's business.
    const gate = shell.indexOf('<TryGuestGate')
    expect(unknown).toBeGreaterThan(-1)
    expect(screen).toBeGreaterThan(unknown)
    expect(gate).toBeGreaterThan(screen)
  })
})

describe('the editor', () => {
  const page = read('src/app/try/editor/page.tsx')
  const gate = read('src/components/editor/phone-gate.tsx')
  const preview = read('src/app/try/preview/page.tsx')

  /**
   * What shipped broken: /try/editor had no phone screen at all. A phone that
   * followed a link to it was handed a layer strip, a property sheet and a
   * 1440px artboard in 390px, on the site whose canvas had just told it to
   * find a bigger screen. The same gate, and the same order: the device is
   * settled before anything below it renders.
   */
  it('is gated the way /try is', () => {
    expect(page).toContain('<EditorPhoneGate>')
    expect(gate).toContain('usePhone()')
    const unknown = gate.indexOf('phone === undefined')
    const screen = gate.indexOf('<PhoneScreen />')
    expect(unknown).toBeGreaterThan(-1)
    expect(screen).toBeGreaterThan(unknown)
  })

  // Looking at a design is the one thing a phone can do with one.
  it('leaves the preview open to a phone', () => {
    expect(preview).not.toMatch(/PhoneGate|usePhone/)
  })
})

describe('what a phone is told', () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(createElement(PhoneScreen))
  const text = host.textContent ?? ''
  const links = [...host.querySelectorAll('a')].map((a) => [
    a.getAttribute('href'),
    a.textContent?.trim(),
  ])

  it('says where Mason draws best', () => {
    expect(text).toContain('Mason draws best on a desktop')
    expect(text).toContain('Open this page on a bigger screen, or look at what people made.')
  })

  it('offers the link and Explore, which is the part that works at this width', () => {
    expect(text).toContain('Copy link')
    expect(links).toContainEqual(['/explore', 'Browse Explore'])
  })

  /**
   * No account, for the reason the cap screen gives: during the free week
   * `/auth/*` sends everyone back to /try, so an account link here would walk
   * a phone into a circle.
   */
  it('offers no account', () => {
    expect(host.innerHTML).not.toMatch(/\/auth/)
  })
})
