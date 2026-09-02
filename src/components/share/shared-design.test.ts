import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { remixHref } from '@/lib/try/remix'

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

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

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
  remixId: null,
}

/**
 * The regression this exists for: both links on a shared design went to `/`,
 * the marketing home. A viewer has just watched the product work — the
 * warmest visitor /try has, and an opened share is one of the numbers the
 * free week is judged on — and the page sent them back to the pitch. The
 * fix was an 11px pill in a corner, which a viewer had to go looking for;
 * it is a bar under the design now, with a sentence about the sketch.
 */
describe('a shared design offers the viewer a way into /try', () => {
  it('under the design, on a live one, with the sketch as the pitch', () => {
    const host = render(DESIGN)
    expect(host.textContent).toContain('A landing page')
    expect(host.textContent).toContain('This started as a rough sketch.')
    expect(host.textContent).toContain('No account needed.')
    expect(links(host)).toEqual(
      expect.arrayContaining([
        ['/', 'Made with SketchMason'],
        [TRY, 'Draw your own, free'],
      ]),
    )
  })

  /**
   * A remix starts from the sketch, and a share holds only the design; the
   * sketch is in the gallery row the owner made by publishing to Explore. So
   * the second pill appears when there is such a row, at the URL the Explore
   * card builds, and not otherwise.
   */
  it('offers a remix at the Explore card\'s URL when the design is in Explore', () => {
    const host = render({ ...DESIGN, remixId: 'gallery1' })
    expect(links(host)).toEqual(
      expect.arrayContaining([[remixHref('gallery1'), 'Remix this design']]),
    )
    expect(remixHref('gallery1')).toBe('/try?remix=gallery1')
  })

  it('and no remix when it is not', () => {
    expect(links(render(DESIGN)).map(([, text]) => text)).not.toContain('Remix this design')
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
 * Both ends of the share funnel spell the remix URL through one function.
 * The shell reads `?remix=`, and two hand-written links to it are two links
 * that can part.
 */
describe('the share page and the Explore card build the same remix link', () => {
  it.each(['src/components/explore/card.tsx', 'src/components/share/shared-design.tsx'])(
    '%s goes through remixHref',
    (path) => {
      const source = read(path)
      expect(source).toContain('remixHref(')
      expect(source).not.toMatch(/\/try\?remix=/)
    },
  )
})

/**
 * The tweet is the one sentence of ours that leaves the site, read by people
 * who have never seen the product. "Mason" on its own is a bricklayer; the
 * public name is SketchMason, and the share card that follows says so too.
 */
describe('the post on X names the public brand', () => {
  it('says SketchMason, not Mason', () => {
    const source = read('src/components/try/use-share-on-x.ts')
    expect(source).toMatch(/SHARE_TEXT = 'I sketched this and SketchMason turned it into a real page/)
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
      const source = read(path)
      expect(source).not.toMatch(/TryGuestGate|useGuest|signIn\(|useAuthActions|admit=/)
    },
  )
})
