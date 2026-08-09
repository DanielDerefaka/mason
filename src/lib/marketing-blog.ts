import type { BlogPost } from '@/types/marketing-content'
import { POSTS, formatDate } from '@/content/posts'

/**
 * The posts, in the shape the ported blog template expects.
 *
 * Written content stays in `src/content/posts.ts` — a single place to edit —
 * and is adapted here rather than duplicated.
 */
export const BLOG_POSTS: BlogPost[] = POSTS.map((post, index) => ({
  slug: post.slug,
  title: post.title,
  date: formatDate(post.date),
  excerpt: post.excerpt,
  category: post.tag,
  readTime: `${post.readingMinutes} min read`,
  // Screenshots of our own app, cycled so each post has a distinct cover.
  cover: ['/images/s2c-canvas.png', '/images/s2c-colours.png', '/images/s2c-workflow.png', '/images/s2c-dashboard.png'][index % 4],
  body: post.body,
}))

export const getPostBySlug = (slug: string) => BLOG_POSTS.find((post) => post.slug === slug)
