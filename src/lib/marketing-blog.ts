import type { BlogPost } from '@/types/marketing-content'
import { POSTS, formatDate } from '@/content/posts'

const BLOG_COVER = '/images/blog-cover.webp'

/**
 * The posts, in the shape the ported blog template expects.
 *
 * Written content stays in `src/content/posts.ts` — a single place to edit —
 * and is adapted here rather than duplicated.
 */
export const BLOG_POSTS: BlogPost[] = POSTS.map((post) => ({
  slug: post.slug,
  title: post.title,
  date: formatDate(post.date),
  excerpt: post.excerpt,
  category: post.tag,
  readTime: `${post.readingMinutes} min read`,
  // Placeholder: every post shares one cover until each has its own. Swap
  // this for a per-post field in `content/posts` when the art exists.
  cover: BLOG_COVER,
  body: post.body,
}))

export const getPostBySlug = (slug: string) => BLOG_POSTS.find((post) => post.slug === slug)
