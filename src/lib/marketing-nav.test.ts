import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  FOOTER_COLUMNS,
  HEADER_NAV,
  HOME_SECTION_IDS,
  SECTION_TO_NAV,
  SOCIAL_LINKS,
} from './marketing-nav'

/**
 * The header is the site's own statement of what matters, and a machine reads
 * it as such: a page linked from every other page is a page the site says is
 * important. Two of the seven slots used to be anchors into the home page, so
 * on /pricing or /blog "Features" and "How It Works" were a link back to `/`,
 * and the three pages written for search intent were in the footer only.
 */
describe('the header', () => {
  const labels = HEADER_NAV.map((item) => item.label)
  const hrefs = HEADER_NAV.map((item) => item.href)

  it('carries the three pages written for search intent', () => {
    expect(hrefs).toContain('/sketch-to-ui')
    expect(hrefs).toContain('/compare')
    expect(hrefs).toContain('/pricing')
  })

  it('links pages, not anchors, apart from Home', () => {
    const anchors = HEADER_NAV.filter((item) => item.href.includes('#'))
    expect(anchors).toEqual([])
  })

  it('names each destination once', () => {
    expect(new Set(labels).size).toBe(labels.length)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  /**
   * The regression this exists for: the highlight map named sections by the
   * labels the header used to have. A value that is not a label in HEADER_NAV
   * highlights nothing, silently, so scrolling the home page lit no link at
   * all through the middle of the page.
   */
  it('highlights a link that exists for every home section', () => {
    for (const id of HOME_SECTION_IDS) {
      expect(SECTION_TO_NAV[id], id).toBeDefined()
      expect(labels, id).toContain(SECTION_TO_NAV[id])
    }
  })

  it('maps no section the home page does not have', () => {
    for (const id of Object.keys(SECTION_TO_NAV)) {
      expect(HOME_SECTION_IDS as readonly string[], id).toContain(id)
    }
  })
})

/**
 * Every internal href in the chrome, held to a route that exists. A footer
 * link to a page nobody built is a 404 on all seven marketing pages at once,
 * and it is the kind of thing a rename does quietly.
 */
describe('what the chrome links to', () => {
  const marketingPages = readdirSync(join(process.cwd(), 'src/app/(marketing)'), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `/${entry.name}`)

  /** Routes outside the marketing group that the chrome is allowed to name. */
  const OTHER_ROUTES = ['/', '/try', '/auth/sign-in', '/auth/sign-up', '/llms.txt', '/download']

  const internal = [...HEADER_NAV, ...FOOTER_COLUMNS.flatMap((column) => column.links)]
    .map((link) => link.href)
    .filter((href) => href.startsWith('/'))

  it('has links to check', () => {
    expect(internal.length).toBeGreaterThan(15)
  })

  it.each([...new Set(internal)])('%s is a route that exists', (href) => {
    // An anchor into the home page is a section, not a route of its own.
    const path = href.split('#')[0].replace(/\/$/, '') || '/'
    if (OTHER_ROUTES.includes(path)) return
    expect(marketingPages, path).toContain(path)
  })

  /**
   * `sameAs` on the Organization block is this list. An account that is not
   * ours in it tells a machine the wrong entity owns the product, which is
   * how an Instagram belonging to somebody at George Mason ended up in the
   * AI Overview for the brand query.
   */
  it('offers only accounts with a handle on the end', () => {
    for (const link of SOCIAL_LINKS) {
      expect(new URL(link.href).pathname.length, link.href).toBeGreaterThan(1)
    }
  })
})
