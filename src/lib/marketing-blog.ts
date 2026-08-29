import type { BlogPost } from '@/types/marketing-content'
import { POSTS, formatDate } from '@/content/posts'

const BLOG_COVER = '/images/blog-cover.webp'
/**
 * What is in the picture, said plainly. It is a painting — green fields under a
 * hazy sky — and not a wireframe, so the alt says so; an alt that named the
 * post instead would describe a picture that is not there. One alt because it
 * is one picture: it moves per post the day the cover does. Both pages
 * rendered it as `alt=""` before this.
 */
const BLOG_COVER_ALT = 'A loosely painted landscape: green fields fading into mist under a pale sky.'

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
  dateTime: post.date,
  excerpt: post.excerpt,
  category: post.tag,
  readTime: `${post.readingMinutes} min read`,
  // Placeholder: every post shares one cover until each has its own. Swap
  // this for a per-post field in `content/posts` when the art exists.
  cover: BLOG_COVER,
  coverAlt: BLOG_COVER_ALT,
  body: post.body,
}))

export const getPostBySlug = (slug: string) => BLOG_POSTS.find((post) => post.slug === slug)
