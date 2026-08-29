import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import robots from './robots'
import sitemap from './sitemap'
import { GET as llmsTxt } from './llms.txt/route'
import { POSTS } from '@/content/posts'
import { ORGANIZATION, POSITIONING } from '@/lib/brand'
import { FAQ_ENTRIES, PENDING_CONFIRMATION } from '@/lib/marketing-faq'
import { SOCIAL_LINKS } from '@/lib/marketing-nav'

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

/**
 * The marketing pages that exist, read from disk rather than from a list
 * someone remembers to edit. The sitemap and /llms.txt both name pages by
 * hand, so this is what holds them to the route tree: a page removed from
 * `src/app` has to leave both.
 */
const APP_DIR = join(process.cwd(), 'src/app')
const marketingPages = readdirSync(join(APP_DIR, '(marketing)'))
  .filter((entry) => existsSync(join(APP_DIR, '(marketing)', entry, 'page.tsx')))
  .map((entry) => `/${entry}`)
  .sort()

/**
 * Whether a one-segment path — /about-us, /try, /llms.txt — has something
 * behind it: a page, or the route handler of a file served at a dotted path.
 */
const pageExists = (path: string) =>
  path === '/' ||
  existsSync(join(APP_DIR, '(marketing)', path.slice(1), 'page.tsx')) ||
  existsSync(join(APP_DIR, path.slice(1), 'page.tsx')) ||
  existsSync(join(APP_DIR, path.slice(1), 'route.ts'))

/**
 * Source with its comments removed, for the assertions phrased as absences.
 *
 * Comments here are long and say why a thing is *not* done — "no openGraph
 * block", "no offers", "no [FOUNDER CONFIRM] placeholder" — so a test grepping
 * the raw file for the forbidden word finds it in the note explaining its own
 * absence and fails on the code being correctly written. `//` is stripped only
 * at the start of a line, or every https:// in the file would take the rest of
 * its line with it.
 */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the site tells a crawler who it is', () => {
  const layout = read('src/app/layout.tsx')

  it('gives every relative URL a host to hang off', () => {
    // Without metadataBase an og:image resolves to a path, and a crawler that
    // is handed a path silently renders no image at all.
    expect(layout).toMatch(/metadataBase: new URL\(/)
  })

  /**
   * The regression this exists for: metadataBase was the apex, and the apex
   * 308s to www. So every canonical and every og:url named a URL that
   * redirects — a canonical that redirects is ignored, and the crawler indexes
   * whatever it was pointed away from.
   *
   * The three files move together or not at all. If Vercel's primary domain is
   * ever flipped back to the apex, this test is the thing that says so.
   */
  it('bases every resolved URL on the host that answers 200', () => {
    // The apex 308s to www, so the bare domain here would make every canonical
    // and every og:url name a redirect.
    expect(read('src/lib/site.ts')).toMatch(/SITE_URL = 'https:\/\/www\.sketchmason\.com'/)
    expect(layout).toMatch(/metadataBase: new URL\(SITE_URL\)/)
  })

  /**
   * One constant, not five literals. The host appears in metadataBase, in
   * robots.txt, in every sitemap entry, in /llms.txt and inside the homepage's
   * structured data — and the failure mode of duplicating it is that four of
   * them are updated and the fifth quietly keeps pointing at a redirect.
   */
  it.each([
    'src/app/robots.ts',
    'src/app/sitemap.ts',
    'src/app/llms.txt/route.ts',
    'src/app/(marketing)/page.tsx',
  ])('%s reads the host from @/lib/site rather than spelling it out', (path) => {
    const source = read(path)
    expect(source).toMatch(/import \{ SITE_URL \} from '@\/lib\/site'/)
    // Not asserted against layout.tsx, which carries the Datafast
    // `data-domain`: that is an analytics site key rather than a URL anything
    // fetches, and rewriting it would split the dashboard's history in two.
    expect(source).not.toMatch(/sketchmason\.com/)
  })

  /**
   * "./" resolves against the current pathname rather than metadataBase —
   * `resolveRelativeUrl` posix-resolves it, and both alternates.canonical and
   * openGraph.url go through it. One line each, and every route gets its own.
   * Hardcoding a string per page is a list someone has to remember, and the
   * page nobody remembers is the one that ships claiming to be the home page.
   */
  it('resolves a canonical per route rather than per page author', () => {
    expect(layout).toMatch(/alternates: \{\s*canonical: "\.\/",/)
  })

  it('resolves og:url the same way', () => {
    expect(layout).toMatch(/url: "\.\/",/)
    // The old hardcoded root url, which every descendant inherited: /explore,
    // /blog and /download all unfurled as the home page because of this line.
    expect(layout).not.toMatch(/url: "\/",/)
  })

  it('titles child pages through one template, with the public name as the suffix', () => {
    expect(layout).toMatch(/default: "SketchMason — draw the shape, get the product"/)
    expect(layout).toMatch(/template: "%s \| SketchMason"/)
  })

  /**
   * The regression this guards: every page used to end its own title with
   * "| Mason" by hand. Adding a template to the root without stripping those
   * gives "Blog | Mason · Mason" on fifteen pages, which is the kind of thing
   * nobody notices until it is in a search result.
   */
  it('leaves no page suffixing the name by hand', () => {
    const offenders = ['src/app/(marketing)/blog/page.tsx', 'src/app/auth/sign-in/layout.tsx']
    for (const path of offenders) expect(read(path)).not.toMatch(/\| (Sketch)?Mason/)
  })

  it('declares an Open Graph card and a large Twitter one', () => {
    expect(layout).toMatch(/openGraph: \{/)
    expect(layout).toMatch(/siteName: "SketchMason"/)
    expect(layout).toMatch(/card: "summary_large_image"/)
  })

  it('draws that card at the size the platforms crop to', () => {
    const image = read('src/app/opengraph-image.tsx')
    expect(image).toMatch(/size = \{ width: 1200, height: 630 \}/)
    // Alt text is a named export, and omitting it is the easiest thing to
    // forget — the image still renders, so nothing fails.
    expect(image).toMatch(/export const alt = /)
    expect(image).toMatch(/SketchMason/)
    expect(image).toMatch(/Draw the shape, get the product/)
    // The subtitle was "Sketch → code": a category the product is not in,
    // on the one image every share of the site carried.
    expect(withoutComments(image)).not.toMatch(/Sketch → code/)
  })

  /** The sentence itself, without the comment above it that explains it. */
  const tryDescription = () =>
    withoutComments(read('src/app/try/layout.tsx')).match(/description:\s*'([^']*)'/)?.[1] ?? ''

  it('gives the free canvas a description that will still be true next month', () => {
    const tryLayout = read('src/app/try/layout.tsx')
    expect(tryLayout).toMatch(/title: 'Try Mason free'/)
    const description = tryDescription()
    expect(description).toMatch(/No account needed/)
    // The old one promised "one free generation a day", which is a number the
    // pool can change and a crawler will keep quoting long after it has. The
    // free week is the same kind of claim: a search engine caches a
    // description well past the Sunday the week ends on.
    expect(description).not.toMatch(/\bone free generation\b/)
    expect(description).not.toMatch(/\b(week|until|limited|September|Sep)\b/i)
    // Long enough to lead with what Mason is, short enough not to be cut off
    // mid-sentence in the result: Google shows about 155 characters.
    expect(description.length).toBeLessThanOrEqual(155)
  })

  /**
   * The regression this exists for: the sentence began at "Draw a frame" — a
   * step, with nothing before it to say what the step was for — on the one
   * result most people meet the product through.
   */
  it('leads the free canvas with what SketchMason is, not with a step', () => {
    const description = tryDescription()
    expect(description).toMatch(/^SketchMason\b/)
    expect(description).toMatch(/sketch/i)
  })

  /**
   * The regression this exists for: /try declared `openGraph: { url: '/try' }`
   * to override the root's hardcoded "/". A child's openGraph *replaces* the
   * parent's object rather than merging into it, so one key set here dropped
   * og:site_name and og:type from the most-shared page on the site — live, for
   * a day. Inheriting is both simpler and the only thing that keeps them.
   */
  it('lets the canvas inherit the site card instead of restating one key of it', () => {
    expect(read('src/app/try/layout.tsx')).not.toMatch(/openGraph: \{/)
  })

  /**
   * Every public page needs a description of its own, because the fallback is
   * the site's — and three pages sharing one sentence under three titles is
   * what the search result and the share card both end up showing.
   */
  it.each([
    'src/app/(marketing)/explore/page.tsx',
    'src/app/(marketing)/blog/page.tsx',
  ])('%s describes itself', (path) => {
    expect(read(path)).toMatch(/description:/)
  })
})

describe('robots.txt', () => {
  const rules = robots()

  it('lets the public site be crawled', () => {
    expect(rules.rules).toMatchObject({ userAgent: '*', allow: '/' })
  })

  it('points at the sitemap', () => {
    expect(rules.sitemap).toBe('https://www.sketchmason.com/sitemap.xml')
  })

  it.each(['/api/', '/dashboard/', '/billing', '/settings'])(
    'keeps a crawler out of %s, which has only a redirect to offer it',
    (path) => {
      const disallowed = (rules.rules as { disallow?: string[] }).disallow ?? []
      expect(disallowed).toContain(path)
    },
  )

  /**
   * The regression this exists for: /auth/ was disallowed, and the brand SERP
   * grew a "Sign in" sitelink anyway. A disallow stops the crawl, not the
   * indexing — Google took the URL from the header link and listed it with no
   * snippet, and the `noindex` that would have removed it sat on a page the
   * crawler was forbidden to read. The auth layout carries the tag; this
   * keeps the door open so it is seen.
   */
  it('lets a crawler read /auth/, or the noindex there is never seen', () => {
    const disallowed = (rules.rules as { disallow?: string[] }).disallow ?? []
    expect(disallowed).not.toContain('/auth/')
  })
})

describe('the auth screens stay out of the index', () => {
  it('send noindex from the one layout all three share', () => {
    expect(read('src/app/auth/layout.tsx')).toMatch(/robots: \{ index: false, follow: false \}/)
  })

  /** One tag, inherited — not three copies that can go out of step. */
  it.each(['sign-in', 'sign-up', 'forgot-password'])('and /auth/%s does not override it', (screen) => {
    expect(read(`src/app/auth/${screen}/layout.tsx`)).not.toMatch(/robots/)
  })
})

describe('sitemap.xml', () => {
  const entries = sitemap()
  const urls = entries.map((entry) => entry.url)

  it('lists the home page and the free canvas', () => {
    expect(urls).toContain('https://www.sketchmason.com/')
    expect(urls).toContain('https://www.sketchmason.com/try')
  })

  it('lists every marketing page that exists', () => {
    expect(marketingPages.length).toBeGreaterThan(3)
    for (const path of marketingPages) {
      expect(urls).toContain(`https://www.sketchmason.com${path}`)
    }
  })

  /**
   * The one entry that is not a page. /llms.txt answered 200 for a week while
   * the sitemap's ten URLs left it out — and a sitemap is the first thing a
   * crawler written for models reads, so nothing that started there knew the
   * file was there to read.
   */
  it('lists /llms.txt, the page written for a model', () => {
    expect(urls).toContain('https://www.sketchmason.com/llms.txt')
  })

  /**
   * The other direction. The sitemap is written by hand, so a page deleted
   * from `src/app` stays in it until someone remembers — and an entry that
   * answers 404 is what Search Console flags the whole file for. When
   * /download was pulled, the hand-written list above was the only thing that
   * noticed, and it noticed in the wrong direction: it demanded the page back.
   */
  it('lists no page that has been removed', () => {
    const pages = urls.map((url) => new URL(url).pathname).filter((path) => path.split('/').length === 2)
    for (const path of pages) expect(pageExists(path), `${path} is listed but has no page`).toBe(true)
  })

  it('lists one entry per written post, from the same source /blog renders', () => {
    for (const post of POSTS) {
      expect(urls).toContain(`https://www.sketchmason.com/blog/${post.slug}`)
    }
  })

  /** A sitemap of redirects is read as a broken sitemap, not an empty one. */
  it('lists nothing that needs a session', () => {
    const gated = urls.filter((url) => /\/(dashboard|billing|settings|auth)\b/.test(url))
    expect(gated).toEqual([])
  })

  it('gives every entry an absolute URL', () => {
    for (const url of urls) expect(url.startsWith('https://www.sketchmason.com/')).toBe(true)
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

describe('the chrome offers the canvas on every page, not just the home page', () => {
  /**
   * The regression this exists for: the hero was pointed at /try, and the
   * header and footer were left behind. So the page said "no sign-up" in the
   * middle and "Start free → /auth/sign-up" at the top and bottom of the same
   * screen, and on every page that is not the home page the only call to
   * action was the sign-up form.
   *
   * Both were `freeWeek ? '/try' : '/auth/sign-up'`, which is the subtler half:
   * they were right during the free week and wrong for the rest of the year,
   * and the free week is the state nobody is looking at the site in.
   */
  it.each([
    ['header', 'src/components/marketing/layout/SiteHeader.tsx'],
    ['mobile nav', 'src/components/marketing/layout/MobileNav.tsx'],
    ['footer', 'src/components/marketing/layout/SiteFooter.tsx'],
  ])('the %s sends "try" at the canvas whatever the week is doing', (_name, path) => {
    const source = read(path)
    expect(source).toMatch(/"\/try"/)
    expect(source).not.toMatch(/freeWeek \? "\/try" : "\/auth\/sign-up"/)
  })

  it('offers the canvas from the footer column too', () => {
    expect(read('src/lib/marketing-nav.ts')).toMatch(
      /\{ label: 'Try it free — no sign-up', href: '\/try' \}/,
    )
  })

  /**
   * Sign-in stays in the header outside the free week. The guard around it is
   * deliberate and stays: while the week is on, `src/app/auth/layout.tsx`
   * redirects every auth screen to /try, and a link that bounces is worse than
   * no link. Removing the guard would put a dead link in the header on the one
   * week of the year the most people see it.
   */
  it('keeps a way in for people who already have an account', () => {
    const header = read('src/components/marketing/layout/SiteHeader.tsx')
    expect(header).toMatch(/href="\/auth\/sign-in"/)
    expect(header).toMatch(/!freeWeek &&/)
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

describe('/llms.txt', () => {
  // The route is a plain function with no request context, so it can be called
  // rather than read — and what is asserted is the body a crawler receives.
  const body = () => llmsTxt().text()

  it('answers as plain text a model can read without parsing HTML', () => {
    const response = llmsTxt()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
  })

  it('says what SketchMason is before it says where anything is', async () => {
    const text = await body()
    expect(text.startsWith('# SketchMason')).toBe(true)
    // Both names in the first sentence: a model that reads this is the thing
    // most likely to be asked "what is Mason?" without the prefix.
    expect(text).toMatch(/^SketchMason — Mason for short — is an AI design tool/m)
    expect(text).toMatch(/turns a hand-drawn\s+interface sketch into a finished, consistent UI design/)
  })

  it('links every public page, on the host that answers 200', async () => {
    const text = await body()
    for (const path of ['/', '/try', '/explore', '/blog', '/faq']) {
      expect(text).toContain(`https://www.sketchmason.com${path})`)
    }
  })

  /** A model that reads a link to a page that no longer exists will offer it. */
  it('links no page that has been removed', async () => {
    const text = await body()
    const paths = [...text.matchAll(/\]\(https:\/\/www\.sketchmason\.com(\/[^)]*)\)/g)].map((m) => m[1])
    expect(paths.length).toBeGreaterThan(3)
    for (const path of paths) {
      if (path.split('/').length === 2) expect(pageExists(path), `${path} is linked but has no page`).toBe(true)
    }
  })

  /**
   * The reason this file carries no figures at all: a model that reads it
   * quotes it, and keeps quoting it long after a pool size or a price has
   * moved. A wrong number in an answer nobody can see being given is worse
   * than no number. The same rule is why the SoftwareApplication block below
   * has no `offers`.
   */
  it('quotes no number anyone can later change', async () => {
    const text = await body()
    expect(text).not.toMatch(/\d/)
    expect(text).not.toMatch(/free tier|per month|credits|\bplan\b/i)
  })

  /**
   * The regression this exists for: the AI Overview for the brand query was
   * crediting Instagram's @sketchmason — somebody at George Mason — to this
   * site, because nothing on the site said which accounts were its own and
   * the name was the only signal. Named here and in the homepage's `sameAs`,
   * both read from the one list the footer renders.
   */
  it("names the account that is actually Mason's", async () => {
    const text = await body()
    expect(text).toContain('Official social: https://x.com/danieldxdere')
  })
})

describe('what the home page tells a machine it is', () => {
  const home = read('src/app/(marketing)/page.tsx')

  it('declares itself an application, on the canonical host', () => {
    expect(home).toMatch(/'@type': 'SoftwareApplication'/)
    expect(home).toMatch(/name: 'SketchMason'/)
    // A design tool, which is the claim the copy makes; it said Developer.
    expect(home).toMatch(/applicationCategory: 'DesignApplication'/)
    expect(home).toMatch(/operatingSystem: 'Web'/)
    expect(home).toMatch(/url: SITE_URL/)
  })

  /**
   * Structured data is a claim to a machine that will repeat it, and an
   * `offers` block is the one claim Google is entitled to print as a price
   * beside the site in a result. What Mason costs is not settled, so the block
   * says only what is: what this is, where it runs, where it lives.
   */
  it('claims no price, because there is not one to claim yet', () => {
    expect(withoutComments(home)).not.toMatch(/offers|priceCurrency|\bprice\b|aggregateRating/i)
  })

  it('gives the block the same sentence the meta description gives', () => {
    // One constant used twice. Structured data contradicting the description
    // on the same page is worse than having neither.
    expect(home).toMatch(/description: DESCRIPTION,/g)
    expect(home.match(/description: DESCRIPTION,/g)).toHaveLength(2)
  })

  /** See the /llms.txt test of the same name: one list, read in both places. */
  it('names its own accounts, from the same list the footer renders', () => {
    expect(home).toMatch(/sameAs: ORGANIZATION\.sameAs/)
    expect(ORGANIZATION.sameAs).toEqual(SOCIAL_LINKS.map((link) => link.href))
    expect(ORGANIZATION.sameAs).toContain('https://x.com/danieldxdere')
  })

  /**
   * The public name is SketchMason and the product's own name is Mason. A
   * search engine that is not told they are one thing holds two brands — and
   * "Mason" on its own is a jar, a university and a bricklayer. `alternateName`
   * is the formal statement, and it is on both blocks so that neither can be
   * read without it. The blog's posts name the same Organization as their
   * publisher rather than spelling a second one by hand.
   */
  it('tells a machine that SketchMason and Mason are one entity', () => {
    expect(ORGANIZATION).toEqual({
      '@type': 'Organization',
      name: 'SketchMason',
      alternateName: 'Mason',
      url: 'https://www.sketchmason.com',
      sameAs: SOCIAL_LINKS.map((link) => link.href),
    })
    expect(home).toMatch(/\{ '@context': 'https:\/\/schema\.org', \.\.\.ORGANIZATION \}/)
    expect(home).toMatch(/alternateName: 'Mason'/)
    expect(home.match(/<JsonLd data=/g)).toHaveLength(2)
    const post = read('src/app/(marketing)/blog/[slug]/page.tsx')
    expect(post).toMatch(/author: ORGANIZATION,/)
    expect(post).toMatch(/publisher: ORGANIZATION,/)
  })

  /**
   * One sentence for the visitor, the crawler and the structured data: the
   * hero prints it under the headline, the meta description is it, and the
   * SoftwareApplication's `description` is the same constant. The root layout
   * falls back to it for any page without a sentence of its own.
   */
  it('says the same sentence to a visitor, a crawler and a machine', () => {
    expect(POSITIONING).toMatch(/^SketchMason is an AI design tool/)
    expect(POSITIONING.length).toBeLessThanOrEqual(155)
    expect(home).toMatch(/const DESCRIPTION = POSITIONING/)
    expect(read('src/components/marketing/home/HeroSection.tsx')).toMatch(/\{POSITIONING\}/)
    expect(read('src/app/layout.tsx')).toMatch(/description: POSITIONING,/)
  })

  /**
   * The regression this exists for: the home page called `redirect('/try')`
   * whenever FREE_WEEK was set, so the landing page vanished from production
   * the moment the flag went on — every campaign link resolved to the canvas
   * instead of the pitch, and / answered 307. The header, footer and hero all
   * offer /try on their own; the visitor is offered the canvas, not moved to
   * it.
   */
  it('serves the landing page whatever the free-week flag is doing', () => {
    expect(home).not.toMatch(/redirect\(/)
    expect(home).not.toMatch(/isFreeWeek/)
  })

  /** The auth gate is the half that stays: /auth/* still bends to /try. */
  it('leaves the free-week gate on the auth screens alone', () => {
    expect(read('src/app/auth/layout.tsx')).toMatch(/isFreeWeek\(\)/)
  })
})

describe('/faq answers only what the code can be checked against', () => {
  const page = read('src/app/(marketing)/faq/page.tsx')

  it('titles and describes itself, and resolves its own canonical', () => {
    expect(page).toMatch(/title: 'FAQ'/)
    expect(page).toMatch(/description:/)
    expect(page).toMatch(/alternates: \{ canonical: '\.\/' \}/)
  })

  /** The shallow-merge landmine: a child openGraph replaces, never merges. */
  it('declares no openGraph block of its own', () => {
    expect(withoutComments(page)).not.toMatch(/openGraph/)
  })

  it('marks itself up as an FAQPage', () => {
    expect(page).toMatch(/'@type': 'FAQPage'/)
    expect(page).toMatch(/'@type': 'Question'/)
    expect(page).toMatch(/acceptedAnswer/)
  })

  /**
   * The markup is mapped from the array the page renders, so the two cannot
   * drift. Two hand-kept lists fail silently and in one direction: the page
   * shows the current answer while the structured data feeds an old one to
   * every machine reading the page.
   */
  it('builds that markup from the same array it renders', () => {
    expect(page).toMatch(/FAQ_ENTRIES\.map/)
    expect(page.match(/FAQ_ENTRIES\.map/g)).toHaveLength(2)
  })

  it('asks enough to be worth a page and few enough to be read', () => {
    expect(FAQ_ENTRIES.length).toBeGreaterThanOrEqual(6)
    expect(FAQ_ENTRIES.length).toBeLessThanOrEqual(12)
  })

  it('ends every question with a question mark and every answer with a full stop', () => {
    for (const entry of FAQ_ENTRIES) {
      expect(entry.question.endsWith('?')).toBe(true)
      expect(entry.answer.trim().endsWith('.')).toBe(true)
    }
  })

  /**
   * A hedge on a public page is still a claim. Where the code did not settle
   * an answer — what it costs, how long a guest canvas lives, what the
   * download email is used for, how much a guest may generate — the question
   * is left off the page entirely and parked in PENDING_CONFIRMATION, rather
   * than published with a placeholder in it. Google would index the
   * placeholder.
   */
  it('publishes no unconfirmed answer, and no placeholder standing in for one', () => {
    expect(PENDING_CONFIRMATION.length).toBeGreaterThan(0)
    for (const entry of FAQ_ENTRIES) {
      expect(entry.answer).not.toMatch(/FOUNDER CONFIRM|TODO|TBD/)
    }
    expect(withoutComments(page)).not.toMatch(/FOUNDER CONFIRM|PENDING_CONFIRMATION/)
  })

  /**
   * Policy may be quoted; configuration may not. "One generation a day" and
   * "fourteen days" are decisions, and they change by someone deciding. The
   * shared pool's size is `COMMUNITY_POOL_SIZE` and the plan price lives in
   * Polar — both move without anyone touching this file, and a crawler would
   * go on quoting the old value for months.
   */
  it('quotes no price, and no figure a deployment can move on its own', () => {
    for (const entry of FAQ_ENTRIES) {
      expect(entry.answer).not.toMatch(/[$£€]|\bper month\b|\ba month\b|\busd\b/i)
      // The pool size, in either form. It is twenty today and is an env var.
      expect(entry.answer).not.toMatch(/\btwenty\b|\b\d+\b/i)
    }
  })

  /**
   * The address collected at download goes on the launch list and the
   * newsletter, so the answer that says "no account needed" has to say that
   * too. A page that describes the ask and omits the use is the version of
   * this page that is worth not having.
   */
  it('says what the download asks for and what it is used for', () => {
    const account = FAQ_ENTRIES.find((entry) => entry.question.includes('account to try it'))
    expect(account?.answer).toMatch(/email address/)
    expect(account?.answer).toMatch(/newsletter/)
  })

  /**
   * The page and the backend are one claim made in two places.
   *
   * /faq promises fourteen days of retention, and `STALE_AFTER_MS` is what
   * actually deletes the work — so the page must not be able to ship a promise
   * the cron does not keep. It could: the constant was thirty when the answer
   * was written, and only a person reading both files would have noticed.
   */
  it('promises the retention the purge cron actually applies', () => {
    const retention = FAQ_ENTRIES.find((entry) => entry.question.includes('How long'))
    expect(retention?.answer).toMatch(/Fourteen days/)
    expect(read('convex/guest.ts')).toMatch(/const STALE_AFTER_MS = 14 \* 24 \* 60 \* 60 \* 1000/)
  })

  it('is listed in the sitemap, or nothing will find it', () => {
    expect(sitemap().map((entry) => entry.url)).toContain('https://www.sketchmason.com/faq')
  })
})

describe('structured data cannot break out of its own script tag', () => {
  /**
   * `JSON.stringify` quotes everything except the one sequence that matters
   * inside a <script>: a literal "</script>" would close the element early and
   * spill the rest of the page into the document as markup. Escaping "<" to
   * its unicode form parses back identically and cannot terminate the tag.
   */
  it('escapes every "<" it emits', () => {
    expect(read('src/components/marketing/JsonLd.tsx')).toMatch(
      /JSON\.stringify\(data\)\.replace\(\/<\/g, '\\\\u003c'\)/,
    )
  })
})

/**
 * The category, held in words.
 *
 * SketchMason is a design tool with an HTML export — `exportDesignHtml` and
 * `exportDesignPrompt` are what a design becomes — and copy that says "sketch
 * to code" or promises "production-ready components" describes a product that
 * does not exist here, which is the first thing a visitor measures the canvas
 * against. The root description, the share card, /try's description and
 * /llms.txt all said it, so the check is on the whole public surface rather
 * than on the four files that were fixed. Comments are stripped first: they
 * are allowed to say what the copy used to say.
 */
describe('the public surface stays in its category', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return walk(path)
      return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : []
    })
  const surface = [
    join(APP_DIR, 'layout.tsx'),
    join(APP_DIR, 'opengraph-image.tsx'),
    join(APP_DIR, 'try/layout.tsx'),
    ...walk(join(APP_DIR, '(marketing)')),
    ...walk(join(APP_DIR, 'llms.txt')),
    ...walk(join(APP_DIR, 's')),
    ...walk(join(process.cwd(), 'src/components/marketing')),
    ...walk(join(process.cwd(), 'src/components/share')),
    ...walk(join(process.cwd(), 'src/components/explore')),
    join(process.cwd(), 'src/lib/brand.ts'),
    ...walk(join(process.cwd(), 'src/lib')).filter((path) => /\/marketing-[^/]+\.ts$/.test(path)),
  ]

  it('is read from disk, so a new page is covered by existing', () => {
    expect(surface.length).toBeGreaterThan(30)
  })

  it('never says sketch-to-code, and never promises production-ready components', () => {
    for (const path of surface) {
      const source = withoutComments(readFileSync(path, 'utf8'))
      expect(source, path).not.toMatch(
        /sketch[- ]to[- ]code|sketch → code|production[- ]ready|working code|real code|code behind it/i,
      )
    }
  })

  /**
   * The Next.js project starter is real (`exportDesignProject`), and the
   * founder chose to name it on /faq — and only there. A code export named in
   * a title, a meta description, a share card or /llms.txt is what a crawler
   * classifies the product by, so the FAQ answer is the one place on the
   * public surface where "Next.js" may appear. Every other swept file is
   * checked, so the sentence cannot be lifted into a meta without a red test.
   */
  it('names the code export on /faq and nowhere else', () => {
    const faq = join(process.cwd(), 'src/lib/marketing-faq.ts')
    expect(withoutComments(readFileSync(faq, 'utf8'))).toMatch(/Next\.js project starter/)
    for (const path of surface) {
      if (path === faq) continue
      const source = withoutComments(readFileSync(path, 'utf8'))
      expect(source, path).not.toMatch(/Next\.js|project starter/i)
    }
  })
})
