import type { MetadataRoute } from 'next'

import { POSTS } from '@/content/posts'
import { SITE_URL } from '@/lib/site'

const SITE = SITE_URL

/**
 * /sitemap.xml, which 404'd until now.
 *
 * Every entry is a page that exists in `src/app` — the marketing routes, the
 * free canvas, and one per written post. Nothing is listed that needs a
 * session: a crawler following those would only be redirected, and a sitemap
 * full of redirects is read as a broken sitemap rather than an empty one.
 *
 * The posts come from `src/content/posts` rather than a second list here,
 * which is the same source `/blog` renders from — so a new post appears in
 * both or in neither.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'weekly', priority: 1 },
    // The trial is the one page the site most wants found.
    { url: `${SITE}/try`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/explore`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE}/blog`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/about-us`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/faq`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const posts: MetadataRoute.Sitemap = POSTS.map((post) => ({
    url: `${SITE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'yearly',
    priority: 0.4,
  }))

  return [...pages, ...posts]
}
