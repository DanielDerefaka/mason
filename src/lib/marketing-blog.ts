import type { BlogPost } from '@/types/marketing-content'
import { POSTS, formatDate } from '@/content/posts'

/**
 * The posts, in the shape the ported blog template expects.
 *
 * Written content stays in `src/content/posts.ts` — a single place to edit —
 * and is adapted here rather than duplicated. Cover art lives on the post
 * record: four posts sharing one landscape painting is how Google indexes
 * one image and none of the articles.
 */
export const BLOG_POSTS: BlogPost[] = POSTS.map((post) => ({
  slug: post.slug,
  title: post.title,
  date: formatDate(post.date),
  dateTime: post.date,
  updated: post.updated,
  excerpt: post.excerpt,
  category: post.tag,
  readTime: `${post.readingMinutes} min read`,
  cover: post.cover,
  coverAlt: post.coverAlt,
  body: post.body,
  faq: post.faq,
}))

export const getPostBySlug = (slug: string) => BLOG_POSTS.find((post) => post.slug === slug)

/** Other posts, newest first, excluding this one. Used as related reading. */
export const relatedPosts = (slug: string, limit = 3) =>
  BLOG_POSTS.filter((post) => post.slug !== slug).slice(0, limit)
