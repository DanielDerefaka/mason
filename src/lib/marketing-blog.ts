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
  // Covers are drawn, not photographed — this picks which accent each gets.
  coverIndex: index,
  body: post.body,
}))

export const getPostBySlug = (slug: string) => BLOG_POSTS.find((post) => post.slug === slug)
