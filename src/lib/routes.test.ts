import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToRegexp } from 'path-to-regexp'
import { describe, expect, it } from 'vitest'

/**
 * The middleware runs on the routes the app serves, and on nothing else.
 *
 * Both halves matter and both have been wrong. Too wide, and an unknown URL is
 * redirected to the sign-in page instead of answering 404 — which is what the
 * site did until now, and which also sent `/opengraph-image` to a login form,
 * so every social card unfurled as a redirect. Too narrow, and a route that
 * needs a session stops being checked, which fails silently and in the
 * dangerous direction.
 *
 * So the matcher is pinned from the filesystem rather than from a list someone
 * remembers to update: every top-level segment under `src/app` must be covered,
 * and invented paths must not be.
 *
 * Matched with `pathToRegexp` directly rather than Next's own matcher, which
 * cannot be loaded outside a Next build — what is under test is the pattern
 * list, not the wrapper. `src/lib/permissions.test.ts` covers the other half:
 * which of the matched routes actually demands a session.
 */
const matcherPatterns = (() => {
  const source = readFileSync(join(process.cwd(), 'src/middleware.ts'), 'utf8')
  const block = source.slice(source.indexOf('matcher: ['))
  const list = block.slice(0, block.indexOf(']') + 1)
  return [...list.matchAll(/'([^']+)'/g)].map((match) => match[1])
})()

const matches = (path: string) =>
  matcherPatterns.some((pattern) => pathToRegexp(pattern).test(path))

/**
 * The top-level URL segments the app really serves, read from the route tree.
 * Route groups — `(marketing)`, `(protected)` — are parentheses in the
 * filesystem and nothing in the URL, so they are stepped through rather than
 * counted; dynamic segments are skipped, since a literal example of one is
 * what the per-route assertions below are for.
 */
const topLevelSegments = (() => {
  const appDir = join(process.cwd(), 'src/app')
  const found = new Set<string>()

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (!statSync(path).isDirectory()) continue
      // A route group contributes no segment of its own; look through it.
      if (entry.startsWith('(') || entry.startsWith('@')) {
        walk(path)
        continue
      }
      // `[slug]` and `[...spec]` have no literal form to test.
      if (entry.startsWith('[') || entry.startsWith('_')) continue
      // A dotted segment is a file the site serves, not a page it routes:
      // `llms.txt/route.ts` answers at /llms.txt. Those must stay *out* of the
      // matcher — the middleware would redirect a crawler fetching them — so
      // they are asserted against below rather than required here.
      if (entry.includes('.')) continue
      found.add(entry)
    }
  }

  walk(appDir)
  return [...found].sort()
})()

describe('the middleware matcher covers every route the app serves', () => {
  it('found a route tree to check at all', () => {
    expect(topLevelSegments.length).toBeGreaterThan(5)
  })

  it.each(topLevelSegments)('/%s is matched', (segment) => {
    expect(matches(`/${segment}`)).toBe(true)
  })

  it('matches the home page', () => {
    expect(matches('/')).toBe(true)
  })

  /**
   * The auth machinery, named explicitly because losing it is not a redirect
   * bug but an outage. `convexAuthNextjsMiddleware` *is* the /api/auth
   * endpoint — it proxies sign-in and sign-out to Convex before any handler
   * runs — so an unmatched /api/auth means no guest can open a session at all,
   * and /try is the whole product for someone without an account.
   */
  it.each(['/api/auth', '/api/try/admit', '/try', '/try/editor', '/try/preview'])(
    '%s is matched, or guests cannot use the canvas',
    (path) => {
      expect(matches(path)).toBe(true)
    },
  )

  it.each(['/dashboard', '/dashboard/abc/canvas', '/billing', '/settings'])(
    '%s is matched, or it stops being behind a login',
    (path) => {
      expect(matches(path)).toBe(true)
    },
  )
})

describe('and nothing else', () => {
  /**
   * The regression this exists for: `/((?!.*\..*|_next).*)` matched every path
   * the site does not serve, so /random-nonsense was not a 404 — it was a
   * redirect to /auth/sign-in, and a mistyped link asked a stranger to log in.
   */
  it.each(['/random-nonsense', '/careers', '/docs/getting-started', '/wp-admin'])(
    '%s falls through to a real 404',
    (path) => {
      expect(matches(path)).toBe(false)
    },
  )

  /**
   * The share card's own image. It has no file extension, so the old pattern's
   * "skip anything with a dot" escape did not save it: crawlers fetching it
   * were redirected to the sign-in page and every unfurl came back blank.
   */
  it('leaves the Open Graph image reachable', () => {
    expect(matches('/opengraph-image')).toBe(false)
  })

  it.each(['/robots.txt', '/sitemap.xml', '/favicon.ico', '/llms.txt'])(
    '%s is served, not gated',
    (path) => {
      expect(matches(path)).toBe(false)
    },
  )
})
