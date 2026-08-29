import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

/**
 * What the page shows turns on one query, so the query is the fixture:
 * undefined while it loads, null for a token that exists nowhere, a design
 * otherwise. Nothing here reaches Convex, and the static renderer runs no
 * effects, so the open is not counted either.
 */
const { shared } = vi.hoisted(() => ({ shared: vi.fn() }))
vi.mock('convex/react', () => ({
  useQuery: () => shared(),
  useMutation: () => async () => undefined,
}))
vi.mock('@/hooks/use-google-font', () => ({ useGoogleFont: () => undefined }))

import { SharedDesign } from './shared-design'

const render = (value: unknown) => {
  shared.mockReturnValue(value)
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(createElement(SharedDesign, { token: 'token' }))
  return host
}

const links = (host: HTMLElement) =>
  [...host.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.textContent?.trim()])

/**
 * `ref` and not `utm_*`, and on both screens: a utm on an internal hop
 * re-labels the session's source in analytics, a bare ref does not. The
 * value is what the dashboard is checked for, so it is pinned exactly.
 */
const TRY = '/try?ref=share'

const DESIGN = {
  label: 'Landing',
  html: '<section><h1>A landing page</h1></section>',
  styleGuide: null,
  previewUrl: null,
}

/**
 * The regression this exists for: both links on a shared design went to `/`,
 * the marketing home. A viewer has just watched the product work — the
 * warmest visitor /try has, and an opened share is one of the numbers the
 * free week is judged on — and the page sent them back to the pitch.
 */
describe('a shared design offers the viewer a way into /try', () => {
  it('beside the mark, on a live design', () => {
    const host = render(DESIGN)
    expect(host.textContent).toContain('A landing page')
    expect(links(host)).toEqual(
      expect.arrayContaining([
        ['/', 'Made with SketchMason'],
        [TRY, 'Try SketchMason free'],
      ]),
    )
  })

  it('first, on a link that is no longer live', () => {
    const host = render(null)
    expect(host.textContent).toContain('This link is no longer live')
    expect(links(host)).toEqual([
      [TRY, 'Try SketchMason free'],
      ['/', 'What is SketchMason?'],
    ])
  })

  it('and nothing while the design is still loading', () => {
    expect(links(render(undefined))).toEqual([])
  })
})

/**
 * Viewing stays what the second-screen fixes made it: a token, no session.
 * A share link is opened by people with no account, on phones and second
 * screens, and a guest session minted to look at a page would spend one of
 * the network's ten daily slots on someone who never draws.
 */
describe('viewing a shared design mints no session', () => {
  it.each(['src/components/share/shared-design.tsx', 'src/app/s/[token]/page.tsx'])(
    '%s reaches the design with a token, not a sign-in',
    (path) => {
      const source = readFileSync(join(process.cwd(), path), 'utf8')
      expect(source).not.toMatch(/TryGuestGate|useGuest|signIn\(|useAuthActions|admit=/)
    },
  )
})
