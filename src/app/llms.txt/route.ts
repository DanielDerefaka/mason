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
 * and the two sentences below are ones that stay true. The link list is the
 * public routes only — the same set the sitemap carries.
 *
 * Note the directory name contains a dot. That keeps it out of the middleware
 * matcher, which is an allow-list of real routes; `src/lib/routes.test.ts`
 * skips dotted segments for the same reason.
 */
const BODY = `# Mason

Mason turns a hand-drawn interface sketch into working code. You draw a rough
frame on a canvas, describe what belongs in it, and Mason generates the
interface and the code behind it.

## Links

- [Mason](${SITE_URL}/): what it is and how it works
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
