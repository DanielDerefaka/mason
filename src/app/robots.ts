import type { MetadataRoute } from 'next'

/**
 * /robots.txt, which 404'd until now.
 *
 * The disallow list is the same shape as the middleware's: anything that needs
 * a session has nothing to offer a crawler but a redirect to the sign-in page,
 * and a crawl budget spent on those is a crawl budget not spent on /try.
 *
 * /s/ is left crawlable deliberately — a shared design is a public page with a
 * card of its own, and being linked to is the point of it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/dashboard/', '/billing', '/settings'],
    },
    // www, matching metadataBase: the apex 308s here, and a sitemap reference
    // that redirects is one more hop between a crawler and the URL list.
    sitemap: 'https://www.sketchmason.com/sitemap.xml',
  }
}
