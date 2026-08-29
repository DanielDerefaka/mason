import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'

/**
 * /robots.txt, which 404'd until now.
 *
 * The disallow list is the same shape as the middleware's: anything that needs
 * a session has nothing to offer a crawler but a redirect to the sign-in page,
 * and a crawl budget spent on those is a crawl budget not spent on /try.
 *
 * /auth/ is not in it, and was. A disallow keeps a crawler from *reading* a
 * page; it does not keep the URL out of the index, and Google listed
 * /auth/sign-in from the header link alone — a "Sign in" sitelink with no
 * snippet, under the brand query. The auth layout sends `noindex` now, and a
 * crawler has to be let in to see it. Three URLs of crawl budget, well spent.
 *
 * /s/ is left crawlable deliberately — a shared design is a public page with a
 * card of its own, and being linked to is the point of it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/billing', '/settings'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
