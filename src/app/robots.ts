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
    sitemap: 'https://sketchmason.com/sitemap.xml',
  }
}
