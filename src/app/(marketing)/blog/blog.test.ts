import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fillMetadataSegment } from 'next/dist/lib/metadata/get-metadata-route'
import { describe, expect, it } from 'vitest'

import { POSTS } from '@/content/posts'
import { BLOG_POSTS } from '@/lib/marketing-blog'

/**
 * What a crawler sees of the blog.
 *
 * It saw almost nothing: all four posts shared the site's fallback description
 * and the site's share card, none carried Article markup, the index was headed
 * "Our Blogs", and every cover was `alt=""`. So the brand query surfaced About
 * Us and Sign in ahead of any post, and a shared post unfurled as the home
 * page. Each is pinned below — from the source where it can only be read, from
 * the data where it can be executed.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

/**
 * The source with its comments removed. The comments in these files explain
 * what is deliberately absent — and so name the very things the assertions
 * below say must be absent. The code is what is checked.
 */
const code = (path: string) =>
  read(path)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const INDEX = 'src/app/(marketing)/blog/page.tsx'
const POST = 'src/app/(marketing)/blog/[slug]/page.tsx'
const CARD = 'src/app/(marketing)/blog/[slug]/opengraph-image.tsx'

describe('every post describes itself', () => {
  it('has an excerpt of its own, written for it', () => {
    const excerpts = POSTS.map((post) => post.excerpt.trim())
    expect(new Set(excerpts).size).toBe(POSTS.length)
    for (const excerpt of excerpts) {
      expect(excerpt.length).toBeGreaterThan(40)
      expect(excerpt.endsWith('.')).toBe(true)
    }
  })

  /** Past about a hundred and sixty characters a result shows an ellipsis. */
  it('and it fits a result whole', () => {
    for (const post of POSTS) expect(post.excerpt.length).toBeLessThanOrEqual(160)
  })

  /**
   * The regression this exists for: the H1 is written to be read, and every
   * post's was also its <title>. With the root template's " | SketchMason"
   * on the end, "Sketches that survive the model: how to label a UI sketch so
   * it builds" was cut mid-clause in the result. `seoTitle` is the short form,
   * and the 46 is what fits beside the suffix in Google's pixel budget.
   */
  it('has a title that survives the suffix', () => {
    for (const post of POSTS) {
      const shown = post.seoTitle ?? post.title
      expect(shown.length, post.slug).toBeLessThanOrEqual(46)
      expect(shown.trim(), post.slug).toBe(shown)
    }
  })

  /**
   * Every link written into a post body, held to a page that exists. The
   * bodies carry a markdown subset the template renders, and it accepts
   * internal paths only: an href a rename broke is a 404 inside the one part
   * of the site written to be linked to.
   */
  it('links only to pages that exist', () => {
    const routes = new Set([
      '/',
      '/try',
      '/explore',
      '/llms.txt',
      ...POSTS.map((post) => `/blog/${post.slug}`),
      ...readdirSync(join(process.cwd(), 'src/app/(marketing)'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => `/${entry.name}`),
    ])
    const found: string[] = []
    for (const post of POSTS) {
      for (const block of post.body) {
        for (const match of block.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
          found.push(match[1])
        }
      }
    }
    expect(found.length).toBeGreaterThan(4)
    for (const href of found) {
      expect(href.startsWith('/'), href).toBe(true)
      expect(routes, href).toContain(href.split('#')[0])
    }
  })

  /**
   * The regression this exists for: generateMetadata returned only a title,
   * so every post's description was the root layout's — one sentence under
   * four titles, in the results and on every share card.
   */
  it('uses that excerpt as the page description', () => {
    expect(code(POST)).toMatch(/description: post\.excerpt/)
  })
})

describe('every post tells a machine what it is', () => {
  const post = code(POST)

  it('marks itself up as a BlogPosting, from the record it renders', () => {
    expect(post).toMatch(/"@type": "BlogPosting"/)
    expect(post).toMatch(/headline: post\.title/)
    expect(post).toMatch(/datePublished: post\.dateTime/)
    expect(post).toMatch(/<JsonLd data=\{blogPosting\(post\) as Record<string, unknown>\} \/>/)
    // The trail comes from the shared helper now, which numbers the positions
    // itself: the page hand-wrote three ListItems and was the only page on the
    // site with a trail at all.
    expect(post).toMatch(/breadcrumbs\(\[/)
    expect(post).toMatch(/name: "Blog", path: "\/blog"/)
    expect(post).toMatch(/name: post\.title/)
  })

  it('writes a modified date only when the post actually changed', () => {
    expect(post).toMatch(/dateModified: post\.updated/)
    expect(post).toMatch(/post\.updated !== post\.dateTime/)
  })

  /**
   * The regression this exists for: the markup pointed at `/opengraph-image`,
   * which answered 404. A metadata route under a route group is served with a
   * hash of its parent path in its name, so the page carries that name as a
   * constant — and this recomputes it with the function Next itself uses,
   * from where the card file really is, so moving the directory cannot leave
   * the markup pointing at nothing.
   */
  it('points the markup at the URL Next actually serves the card from', () => {
    const segment = dirname(CARD).replace(/^src\/app/, '')
    const served = fillMetadataSegment(segment, { slug: 'a-post' }, 'opengraph-image')
    expect(served).toMatch(/^\/blog\/a-post\/opengraph-image-[0-9a-z]{6}$/)
    const name = served.split('/').pop()
    expect(post).toContain(`const POST_CARD = "${name}";`)
    expect(post).toMatch(/import \{ SITE_URL \} from "@\/lib\/site"/)
    expect(post).toMatch(/image: \[`\$\{url\}\/\$\{POST_CARD\}`, `\$\{SITE_URL\}\$\{post\.cover\}`\]/)
  })

  it('carries the date as a <time> a machine can read', () => {
    expect(post).toMatch(/<time dateTime=\{post\.dateTime\}>/)
    expect(code(INDEX)).toMatch(/dateTime=\{post\.dateTime\}/)
    // The ISO date behind the formatted one, from the same record.
    for (const entry of BLOG_POSTS) expect(entry.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('every post has a card of its own', () => {
  it('composed beside the page, at the size the platforms crop to', () => {
    expect(existsSync(join(process.cwd(), CARD))).toBe(true)
    const card = code(CARD)
    expect(card).toMatch(/size = \{ width: 1200, height: 630 \}/)
    expect(card).toMatch(/export const alt = /)
    expect(card).toMatch(/\{post\.title\}/)
  })

  it('answers 404, not a card, for a post that does not exist', () => {
    expect(code(CARD)).toMatch(/if \(!post\) return new Response\(null, \{ status: 404 \}\)/)
  })

  /** The title is set at 72px across 1000px, and three lines is the frame. */
  it('has a title that fits the frame', () => {
    for (const post of POSTS) expect(post.title.length).toBeLessThanOrEqual(80)
  })
})

describe('the cover says what it shows', () => {
  /**
   * The regression this exists for: both pages rendered the cover with
   * `alt=""`. The alt describes the picture that is actually there, and each
   * post has its own picture. Four posts sharing one landscape is how Google
   * indexes one image and none of the articles.
   */
  it.each([INDEX, POST])('%s gives the cover its alt', (path) => {
    const source = code(path)
    expect(source).not.toMatch(/alt=""/)
    expect(source).toMatch(/alt=\{post\.coverAlt\}/)
  })

  it('from a field beside the cover it describes', () => {
    for (const post of BLOG_POSTS) expect(post.coverAlt.length).toBeGreaterThan(20)
  })

  it('gives every post a cover of its own, on disk', () => {
    const covers = BLOG_POSTS.map((post) => post.cover)
    expect(new Set(covers).size).toBe(BLOG_POSTS.length)
    const alts = BLOG_POSTS.map((post) => post.coverAlt)
    expect(new Set(alts).size).toBe(BLOG_POSTS.length)
    for (const post of BLOG_POSTS) {
      expect(post.cover).not.toMatch(/blog-cover/)
      expect(existsSync(join(process.cwd(), 'public', post.cover.replace(/^\//, '')))).toBe(
        true,
      )
    }
  })
})

describe('the index is named, not labelled', () => {
  const index = code(INDEX)

  /**
   * "Our Blogs" gave a machine nothing to attach to the entity, and "Mason"
   * alone is a name-collision query. The heading names the blog; the line
   * under it is the same sentence the result shows.
   */
  it('heads the page with the name in it', () => {
    const heading = index.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/\s+/g, ' ').trim()
    expect(heading).toBe('The SketchMason <span className="font-display-italic">blog</span>')
  })

  it('opens with the same sentence its description gives', () => {
    expect(index).toMatch(/description: DESCRIPTION,/)
    expect(index).toMatch(/\{DESCRIPTION\}/)
  })
})
