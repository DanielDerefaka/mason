import type { MetadataRoute } from 'next'

import { POSTS } from '@/content/posts'
import { LEGAL_UPDATED } from '@/lib/marketing-legal'
import { SITE_URL } from '@/lib/site'

const SITE = SITE_URL

/**
 * /sitemap.xml, which 404'd until now.
 *
 * Every entry is a route that exists in `src/app` — the marketing pages, the
 * free canvas, /llms.txt, and one per written post. Nothing is listed that
 * needs a session: a crawler following those would only be redirected, and a
 * sitemap full of redirects is read as a broken sitemap rather than an empty
 * one.
 *
 * The posts come from `src/content/posts` rather than a second list here,
 * which is the same source `/blog` renders from — so a new post appears in
 * both or in neither.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Parsed as UTC: without the suffix a build west of Greenwich reads the
  // date as local midnight and the sitemap says the day before.
  const legal = new Date(`${LEGAL_UPDATED} UTC`)

  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: 'weekly', priority: 1 },
    // The trial is the one page the site most wants found.
    { url: `${SITE}/try`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/explore`, changeFrequency: 'daily', priority: 0.7 },
    {
      url: `${SITE}/blog`,
      changeFrequency: 'weekly',
      priority: 0.6,
      lastModified: new Date(
        POSTS.reduce((latest, post) => {
          const stamp = post.updated ?? post.date
          return stamp > latest ? stamp : latest
        }, POSTS[0]?.date ?? '2026-01-01'),
      ),
    },
    { url: `${SITE}/about-us`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/pricing`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/compare`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/sketch-to-ui`, changeFrequency: 'monthly', priority: 0.7 },
    // The only two pages with a revision date a person can check, so they
    // are the only two that get a `lastModified`. A date invented for a page
    // that has not changed is a claim the next crawl disproves, and a
    // sitemap whose every entry says "today" is one Google stops reading.
    { url: `${SITE}/privacy`, changeFrequency: 'yearly', priority: 0.2, lastModified: legal },
    { url: `${SITE}/terms`, changeFrequency: 'yearly', priority: 0.2, lastModified: legal },
    // Not a page but a file, and the one entry a crawler written for models
    // is looking for. It answered 200 for a week while this list left it out,
    // which is the kind of omission nothing reports.
    { url: `${SITE}/llms.txt`, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const posts: MetadataRoute.Sitemap = POSTS.map((post) => ({
    url: `${SITE}/blog/${post.slug}`,
    lastModified: new Date(post.updated ?? post.date),
    changeFrequency: 'yearly',
    priority: 0.4,
  }))

  return [...pages, ...posts]
}
