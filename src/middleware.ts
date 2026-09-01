import { trackAICrawlerRequest } from '@datafast/ai-crawl'
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

import { datafastCrawlerConfig } from '@/lib/datafast'
import { isBypassRoute } from '@/lib/permissions'

const bypassMatcher = createRouteMatcher(isBypassRoute)

const auth = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (bypassMatcher(request)) return
    if (await convexAuth.isAuthenticated()) return
    return nextjsMiddlewareRedirect(request, '/auth/sign-in')
  },
  {
    // Without this the auth cookies are session cookies: closing the browser
    // ends the session. That is merely annoying for an account — you sign in
    // again — but for a guest it is the work itself, because an anonymous
    // session is the only handle on the projects it made. Thirty days.
    cookieConfig: { maxAge: 60 * 60 * 24 * 30 },
  },
)

/**
 * DataFast bot-traffic tracking is a server call, not the browser script.
 * Crawlers skip JavaScript, so the pageview pixel never sees them. The
 * package filters humans and static assets itself; we must not await it,
 * or the page waits on their network. `event` is how Vercel `waitUntil`s
 * the POST after we have already returned.
 */
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  trackAICrawlerRequest(request, event, datafastCrawlerConfig())
  return auth(request, event)
}

/**
 * The routes this app actually serves — and nothing else.
 *
 * This was `/((?!.*\..*|_next).*)`, which is every path the site does not
 * serve as well as every path it does. Two things followed from that, both
 * bugs. A typo'd URL like /random-nonsense reached the middleware, was not
 * bypassed, and 307'd to the sign-in page: the site had no 404 at all, only a
 * door. And `/opengraph-image` — no file extension, so not excluded, and not
 * in the bypass list — did the same, meaning every social card fetched a
 * redirect to a login form instead of a picture.
 *
 * An allow-list fixes both by omission. A path that matches nothing here never
 * enters the middleware, so Next routes it normally and unknown ones fall
 * through to `not-found.tsx` with a real 404.
 *
 * What must stay listed, and why the list is not just the protected routes:
 * `convexAuthNextjsMiddleware` *is* the /api/auth endpoint — it proxies every
 * sign-in and sign-out to Convex itself before any handler runs — and it is
 * also what refreshes the auth cookie on an ordinary page view. Dropping
 * /api/auth would break guest sign-in outright; dropping /try would leave a
 * guest's session to expire under them. So every real route stays, the bypass
 * list below still decides which of them needs a session, and the only paths
 * that lost the middleware are the ones with nothing behind them.
 *
 * Static assets and Next internals are excluded by the same omission, which is
 * what the old negative lookahead was for.
 *
 * `src/lib/routes.test.ts` walks `src/app` and fails if a real route segment
 * is missing here, so a new page cannot quietly lose its auth check.
 */
export const config = {
  matcher: [
    '/',
    // The auth endpoint the middleware serves itself. Not optional.
    '/api/:path*',
    '/auth/:path*',
    '/try',
    '/try/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/billing',
    '/settings',
    '/blog',
    '/blog/:path*',
    '/about-us',
    '/faq',
    '/explore',
    '/pricing',
    '/privacy',
    '/terms',
    '/compare',
    '/sketch-to-ui',
    '/s/:path*',
    // Gone, on purpose: answers 410. Listed so a crawler hits the handler
    // rather than the auth wall; unlisted it would 404 the same way unknown
    // paths do, which is the weaker not-here-today signal Google already
    // had, and the brand SERP kept the Download sitelink.
    '/download',
    // Crawler-facing files. The DataFast bot tracker only sees what this
    // middleware runs on, and AI crawlers ask for these before the pages.
    // They stay bypassed: listing them here used to be how a crawler was
    // sent to sign-in instead of the file.
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
  ],
}
