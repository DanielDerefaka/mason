import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import robots from './robots'
import sitemap from './sitemap'
import { POSTS } from '@/content/posts'

/**
 * What a crawler and a link preview see.
 *
 * None of it existed before: no og: or twitter: tags anywhere, /robots.txt and
 * /sitemap.xml both 404, and no link from the home page to the one part of the
 * product that needs no account. The share button was shipping bare blue links.
 *
 * The metadata itself is read from source rather than rendered, because
 * resolving it needs a Next request context; what can be executed — the robots
 * and sitemap routes are plain functions — is executed.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('the site tells a crawler who it is', () => {
  const layout = read('src/app/layout.tsx')

  it('gives every relative URL a host to hang off', () => {
    // Without metadataBase an og:image resolves to a path, and a crawler that
    // is handed a path silently renders no image at all.
    expect(layout).toMatch(/metadataBase: new URL\(/)
    expect(layout).toMatch(/https:\/\/sketchmason\.com/)
  })

  it('titles child pages through one template', () => {
    expect(layout).toMatch(/default: "Mason — sketch to code"/)
    expect(layout).toMatch(/template: "%s · Mason"/)
  })

  /**
   * The regression this guards: every page used to end its own title with
   * "| Mason" by hand. Adding a template to the root without stripping those
   * gives "Blog | Mason · Mason" on fifteen pages, which is the kind of thing
   * nobody notices until it is in a search result.
   */
  it('leaves no page suffixing the name by hand', () => {
    const offenders = ['src/app/(marketing)/blog/page.tsx', 'src/app/auth/sign-in/layout.tsx']
    for (const path of offenders) expect(read(path)).not.toMatch(/\| Mason/)
  })

  it('declares an Open Graph card and a large Twitter one', () => {
    expect(layout).toMatch(/openGraph: \{/)
    expect(layout).toMatch(/siteName: "Mason"/)
    expect(layout).toMatch(/card: "summary_large_image"/)
  })

  it('draws that card at the size the platforms crop to', () => {
    const image = read('src/app/opengraph-image.tsx')
    expect(image).toMatch(/size = \{ width: 1200, height: 630 \}/)
    // Alt text is a named export, and omitting it is the easiest thing to
    // forget — the image still renders, so nothing fails.
    expect(image).toMatch(/export const alt = /)
    expect(image).toMatch(/Sketch → code/)
  })

  it('gives the free canvas a description that will still be true next month', () => {
    const tryLayout = read('src/app/try/layout.tsx')
    expect(tryLayout).toMatch(/title: 'Try Mason free'/)
    expect(tryLayout).toMatch(/No account needed/)
    // The old one promised "one free generation a day", which is a number the
    // pool can change and a crawler will keep quoting long after it has.
    expect(tryLayout).not.toMatch(/\bone free generation\b/)
  })
})

describe('robots.txt', () => {
  const rules = robots()

  it('lets the public site be crawled', () => {
    expect(rules.rules).toMatchObject({ userAgent: '*', allow: '/' })
  })

  it('points at the sitemap', () => {
    expect(rules.sitemap).toBe('https://sketchmason.com/sitemap.xml')
  })

  it.each(['/api/', '/auth/', '/dashboard/', '/billing', '/settings'])(
    'keeps a crawler out of %s, which has only a redirect to offer it',
    (path) => {
      const disallowed = (rules.rules as { disallow?: string[] }).disallow ?? []
      expect(disallowed).toContain(path)
    },
  )
})

describe('sitemap.xml', () => {
  const entries = sitemap()
  const urls = entries.map((entry) => entry.url)

  it('lists the home page and the free canvas', () => {
    expect(urls).toContain('https://sketchmason.com/')
    expect(urls).toContain('https://sketchmason.com/try')
  })

  it('lists every marketing page that exists', () => {
    for (const path of ['/explore', '/download', '/blog', '/about-us']) {
      expect(urls).toContain(`https://sketchmason.com${path}`)
    }
  })

  it('lists one entry per written post, from the same source /blog renders', () => {
    for (const post of POSTS) {
      expect(urls).toContain(`https://sketchmason.com/blog/${post.slug}`)
    }
  })

  /** A sitemap of redirects is read as a broken sitemap, not an empty one. */
  it('lists nothing that needs a session', () => {
    const gated = urls.filter((url) => /\/(dashboard|billing|settings|auth)\b/.test(url))
    expect(gated).toEqual([])
  })

  it('gives every entry an absolute URL', () => {
    for (const url of urls) expect(url.startsWith('https://sketchmason.com/')).toBe(true)
  })
})

describe('the home page offers the canvas before the sign-up form', () => {
  /**
   * The regression this exists for: the home page had no link to /try at all.
   * Every call to action went to /auth/sign-up, so the one thing a visitor
   * could do without an account was the one thing the site never showed them.
   */
  it('puts /try in the hero as the primary action', () => {
    const content = read('src/lib/marketing-content.ts')
    expect(content).toMatch(/primary: \{ label: 'Try it free — no sign-up', href: '\/try' \}/)
  })

  it('renders both pills, the canvas one first', () => {
    const hero = read('src/components/marketing/home/HeroSection.tsx')
    expect(hero).toMatch(/pill pill-primary/)
    expect(hero).toMatch(/pill pill-secondary/)
    expect(hero.indexOf('pill-primary')).toBeLessThan(hero.indexOf('pill-secondary'))
  })
})

describe('the footer links to accounts that exist', () => {
  const nav = read('src/lib/marketing-nav.ts')
  // The array alone, not the file: the comment above it names the dead links
  // it exists to explain, and a prose mention is not a link.
  // From the `= [` rather than the name, or the `[]` in `SocialLink[]` closes
  // the slice before it has opened.
  const open = nav.indexOf('= [', nav.indexOf('SOCIAL_LINKS'))
  const literal = nav.slice(open, nav.indexOf(']', open) + 1)

  it('points X at a real handle', () => {
    expect(literal).toMatch(/href: 'https:\/\/x\.com\/danieldxdere'/)
  })

  /**
   * They pointed at instagram.com, facebook.com and linkedin.com — the
   * platforms' front doors, no handle attached. Four icons that go nowhere
   * cost more trust than they buy.
   */
  it.each(['instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com'])(
    'has dropped the bare %s link',
    (host) => {
      expect(literal).not.toMatch(new RegExp(host.replace('.', '\\.')))
    },
  )
})
