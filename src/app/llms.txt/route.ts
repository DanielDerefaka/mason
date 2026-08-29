import { SOCIAL_LINKS } from '@/lib/marketing-nav'
import { SITE_URL } from '@/lib/site'

/**
 * /llms.txt — what this site is, for something reading it rather than
 * browsing it.
 *
 * A route handler rather than a static file in `public/`, so the host comes
 * from the same constant as metadataBase, robots.ts and sitemap.ts and cannot
 * drift from them.
 *
 * Deliberately free of pitch: no adjectives, no numbers, no pricing. A model
 * quoting this will quote it long after any figure in it stopped being true,
 * and the sentences below are ones that stay true. The link list is the
 * public routes only — the same set the sitemap carries.
 *
 * The social line is there because the brand query's AI Overview was crediting
 * an Instagram account that is not Mason's: with nothing on the site saying
 * which accounts are its own, the name was the only signal, and "Mason" is a
 * name a lot of people have. It reads the footer's list, the same one the
 * homepage's structured data names in `sameAs`.
 *
 * Note the directory name contains a dot. That keeps it out of the middleware
 * matcher, which is an allow-list of real routes; `src/lib/routes.test.ts`
 * skips dotted segments for the same reason.
 */
const BODY = `# SketchMason

SketchMason — Mason for short — is an AI design tool that turns a hand-drawn
interface sketch into a finished, consistent UI design. You draw a rough frame
on a canvas, describe what belongs in it, and SketchMason generates the screen
against a design system read from your own mood board. A design exports as a
standalone HTML file or as a written brief.

Official social: ${SOCIAL_LINKS.map((link) => link.href).join(', ')}

## Links

- [SketchMason](${SITE_URL}/): what it is and how it works
- [Try it](${SITE_URL}/try): draw and generate in the browser, no account
- [Explore](${SITE_URL}/explore): designs people made with it
- [Blog](${SITE_URL}/blog): notes on how it is built
- [FAQ](${SITE_URL}/faq): common questions
`

export const dynamic = 'force-static'

export function GET() {
  return new Response(BODY, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  })
}
