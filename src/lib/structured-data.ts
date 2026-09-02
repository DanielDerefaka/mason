import { SITE_URL } from '@/lib/site'

/**
 * The two blocks every page can carry, and the identifiers that tie the site's
 * nodes together.
 *
 * Structured data stopped at the blog: /pricing, /about-us, /privacy and
 * /terms carried none at all, and only posts had breadcrumbs, so the pages an
 * answer engine reaches for "how much does SketchMason cost" or "who makes
 * SketchMason" had nothing machine-readable on them. A WebPage with a trail
 * is the honest minimum: it says what the page is, and that it belongs to the
 * same organisation as everything else here.
 *
 * The `@id` values matter more than they look. The homepage and /try each
 * emitted a SoftwareApplication with the same name and a different `url`,
 * which reads as two products rather than one product on two pages. A shared
 * `@id` is the statement that they are one node.
 */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const SOFTWARE_ID = `${SITE_URL}/#software`
export const WEBSITE_ID = `${SITE_URL}/#website`

/** A site URL with no trailing slash on the root, which is what the canonical uses. */
const at = (path: string) => (path === '/' ? SITE_URL : `${SITE_URL}${path}`)

/**
 * Home is prepended, so a caller passes only the trail below it. Positions are
 * one-based and must be contiguous, which is why they are counted here rather
 * than written at each call site: the post template numbered its own and was
 * the only page that had any.
 */
export const breadcrumbs = (trail: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: at(item.path),
  })),
})

/**
 * A page, as an entity. No `offers` and no `aggregateRating` anywhere in here,
 * for the reason the homepage's block gives: structured data is a claim a
 * machine will repeat, and neither a price nor a review count is settled.
 */
export const webPage = (name: string, path: string, description: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name,
  description,
  url: at(path),
  isPartOf: { '@type': 'WebSite', '@id': WEBSITE_ID, url: SITE_URL },
  about: { '@id': ORGANIZATION_ID },
})
