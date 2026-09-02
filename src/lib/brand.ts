import { CONTACT, SOCIAL_LINKS } from '@/lib/marketing-nav'
import { SITE_URL } from '@/lib/site'
import { ORGANIZATION_ID } from '@/lib/structured-data'

/**
 * The name, and what it stands for, in one place.
 *
 * The public name is SketchMason; the product calls itself Mason. Two names
 * for one thing is fine as long as every machine reading the site is told so,
 * which is what `alternateName` below is: the formal statement that "Mason"
 * and "SketchMason" are one entity, for the search engines and assistants
 * that used to split the brand query between a jar, a university and a
 * Dribbble template. The marketing pages, the metadata, the share cards and
 * /llms.txt say SketchMason; the canvas, the editor and everything behind a
 * session still say Mason, on purpose.
 *
 * `POSITIONING` is the sentence the homepage's meta description, its
 * SoftwareApplication block and its hero all use, verbatim. The description
 * and the structured data on one page must agree, and three copies of a
 * sentence is how they stop agreeing.
 *
 * "Design", deliberately, and never "code". What a generation produces is a
 * finished design that exports as HTML or as a written brief —
 * `exportDesignHtml` and `exportDesignPrompt` in `lib/export.ts` — and copy
 * that says "sketch to code" or "production-ready components" describes a
 * different product. `src/app/metadata.test.ts` refuses both phrases across
 * the whole public surface.
 */
export const POSITIONING =
  'SketchMason is an AI design tool that turns a hand-drawn interface sketch into a finished UI design, built on a design system and exported as HTML.'

/**
 * The organisation, as structured data.
 *
 * No `@context` here: the same object is spread into a top-level block on the
 * homepage and nested as `author` and `publisher` inside every BlogPosting,
 * and a context on a nested node is noise a validator flags. `sameAs` reads
 * the footer's list rather than repeating it — one place says which accounts
 * are the site's own, and /llms.txt reads the same one. Before that list
 * existed, the AI Overview for the brand query was crediting an Instagram
 * account that belonged to somebody at George Mason.
 */
export const ORGANIZATION = {
  '@type': 'Organization',
  // The identifier every other block points at. Without it the homepage
  // declared an Organization, each post named a `publisher` with the same
  // fields, and nothing said the two were the same node: a machine reading
  // the site had one entity per page rather than one entity.
  '@id': ORGANIZATION_ID,
  name: 'SketchMason',
  alternateName: 'Mason',
  url: SITE_URL,
  // The knowledge-panel logo, not the SERP favicon. Google reads this from
  // Organization; the favicon is a separate crawl of /favicon.ico. The apple
  // icon is the mark at 180, square, a stable URL — Next's hashed /icon.svg
  // is not.
  logo: `${SITE_URL}/apple-icon.png`,
  sameAs: SOCIAL_LINKS.map((link) => link.href),
  // The same address the footer prints. A contact point is one of the few
  // fields a knowledge panel will show, and it was the one thing the site
  // told visitors and never told a machine.
  email: CONTACT.email,
}
