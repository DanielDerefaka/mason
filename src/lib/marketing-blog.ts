import type { BlogPost } from '@/types/marketing-content'
import { POSTS, formatDate } from '@/content/posts'

/**
 * Reading time, counted rather than declared.
 *
 * Every post carried a `readingMinutes` written by hand, and every one of
 * them was wrong: bodies of 156 to 269 words claimed three to six minutes.
 * A number a reader can check against the page they are looking at is worth
 * having right, so it is derived from the words. 200 a minute is the usual
 * figure for prose on a screen, and no post rounds to less than one.
 */
const WORDS_PER_MINUTE = 200

export const readingMinutes = (body: string[]) => {
  const words = body.join(' ').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

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
  seoTitle: post.seoTitle,
  date: formatDate(post.date),
  dateTime: post.date,
  updated: post.updated,
  excerpt: post.excerpt,
  category: post.tag,
  readTime: `${readingMinutes(post.body)} min read`,
  cover: post.cover,
  coverAlt: post.coverAlt,
  body: post.body,
  faq: post.faq,
}))

export const getPostBySlug = (slug: string) => BLOG_POSTS.find((post) => post.slug === slug)

/**
 * What to read next: same subject first, then the rest, rotated.
 *
 * This used to be `filter(not self).slice(0, 3)` over array order, which gave
 * all nine posts the same three suggestions and left five of them with a
 * single inbound link in the whole site, from the index. Preferring the same
 * `category` makes the suggestion mean something, and starting the remainder
 * at this post's own position spreads the links instead of pointing every
 * page at the top of the array.
 */
export const relatedPosts = (slug: string, limit = 3) => {
  const self = getPostBySlug(slug)
  const others = BLOG_POSTS.filter((post) => post.slug !== slug)
  const sameSubject = others.filter((post) => post.category === self?.category)
  const rest = others.filter((post) => post.category !== self?.category)
  const start = Math.max(0, BLOG_POSTS.findIndex((post) => post.slug === slug))
  const rotated = [...rest.slice(start), ...rest.slice(0, start)]
  return [...sameSubject, ...rotated].slice(0, limit)
}
