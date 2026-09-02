import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { SITE_URL } from './site'
import { breadcrumbs, ORGANIZATION_ID, SOFTWARE_ID, webPage, WEBSITE_ID } from './structured-data'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('a breadcrumb trail', () => {
  const trail = breadcrumbs([
    { name: 'Blog', path: '/blog' },
    { name: 'A post', path: '/blog/a-post' },
  ])

  /**
   * Home is prepended rather than written at each call site. The blog post
   * template was the only page on the site with a trail at all, and it
   * numbered its own positions by hand: three literals to keep in step.
   */
  it('starts at home, whatever the caller passed', () => {
    expect(trail.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: SITE_URL,
    })
  })

  it('numbers the positions itself, contiguously from one', () => {
    expect(trail.itemListElement.map((item) => item.position)).toEqual([1, 2, 3])
  })

  it('writes absolute urls, with no trailing slash on the root', () => {
    expect(trail.itemListElement.map((item) => item.item)).toEqual([
      SITE_URL,
      `${SITE_URL}/blog`,
      `${SITE_URL}/blog/a-post`,
    ])
  })
})

describe('a page block', () => {
  const page = webPage('Pricing', '/pricing', 'What it costs.')

  it('says what the page is and where it lives', () => {
    expect(page['@type']).toBe('WebPage')
    expect(page.name).toBe('Pricing')
    expect(page.url).toBe(`${SITE_URL}/pricing`)
  })

  it('belongs to the one website and the one organisation', () => {
    expect(page.isPartOf['@id']).toBe(WEBSITE_ID)
    expect(page.about['@id']).toBe(ORGANIZATION_ID)
  })

  /**
   * Structured data is a claim a machine will repeat. Neither a price nor a
   * review count is settled here, so no helper may emit one.
   */
  it('claims no price and no rating', () => {
    expect(JSON.stringify(page)).not.toMatch(/offers|price|aggregateRating/i)
  })
})

/**
 * The regression this exists for: the home page and /try each emitted a
 * SoftwareApplication with the same name and a different `url`. Two nodes
 * with one name read as two products, and the brand query was already being
 * split three ways. A shared `@id` is the statement that they are one node.
 */
describe('one product, however many pages describe it', () => {
  it.each([
    ['the home page', 'src/app/(marketing)/page.tsx'],
    ['/try', 'src/app/try/page.tsx'],
  ])('%s names the same application node', (_label, path) => {
    const source = read(path)
    expect(source).toMatch(/'@type': 'SoftwareApplication'/)
    expect(source).toMatch(/'@id': SOFTWARE_ID/)
    expect(source).toMatch(/publisher: \{ '@id': ORGANIZATION_ID \}/)
  })

  it('keeps the three identifiers apart', () => {
    expect(new Set([ORGANIZATION_ID, SOFTWARE_ID, WEBSITE_ID]).size).toBe(3)
    for (const id of [ORGANIZATION_ID, SOFTWARE_ID, WEBSITE_ID]) {
      expect(id.startsWith(`${SITE_URL}/#`)).toBe(true)
    }
  })
})

/**
 * Structured data used to stop at the blog: /pricing, /about-us, /privacy and
 * /terms carried none at all, so the pages an answer engine reaches for "how
 * much does SketchMason cost" or "who makes SketchMason" had nothing
 * machine-readable on them. Swept from disk, so a new marketing page has to
 * decide rather than inherit the omission.
 */
describe('every marketing page says what it is', () => {
  const group = join(process.cwd(), 'src/app/(marketing)')
  const pages = readdirSync(group, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('['))
    .map((entry) => join('src/app/(marketing)', entry.name, 'page.tsx'))
    .filter((path) => {
      try {
        return statSync(join(process.cwd(), path)).isFile()
      } catch {
        return false
      }
    })

  it('found the pages', () => {
    expect(pages.length).toBeGreaterThan(6)
  })

  it.each(pages.map((path) => [path]))('%s carries a page block and a trail', (path) => {
    const source = read(path)
    expect(source).toMatch(/webPage\(/)
    expect(source).toMatch(/breadcrumbs\(\[/)
  })

  /** The home page is its own root: an Organization, a WebSite and the product. */
  it('leaves the home page to its own blocks', () => {
    const home = read('src/app/(marketing)/page.tsx')
    expect(home).toMatch(/ORGANIZATION_BLOCK/)
    expect(home).toMatch(/WEBSITE_BLOCK/)
  })
})
