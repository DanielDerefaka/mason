import { pathToRegexp } from 'path-to-regexp'
import { describe, expect, it } from 'vitest'

import { isBypassRoute } from './permissions'

/**
 * The middleware has been wrong before, and it is wrong silently: a page that
 * should be reachable redirects, or a page that should not be answers 200.
 * These pin the routes /try depends on.
 *
 * Matched with `pathToRegexp` directly rather than through the auth package's
 * `createRouteMatcher`, which is the same call on the same library — its Next
 * server entry cannot be loaded outside Next, and what is under test is the
 * pattern list, not the wrapper.
 */
const matcher = (patterns: string[]) => {
  const regexes = patterns.map((pattern) => pathToRegexp(pattern))
  return (path: string) => regexes.some((regex) => regex.test(path))
}

const bypass = matcher(isBypassRoute)
const at = (path: string) => path

describe('the free canvas', () => {
  it.each(['/try', '/try/editor', '/try/preview', '/explore', '/api/try/admit'])(
    '%s skips the auth check entirely',
    (path) => {
      expect(bypass(at(path))).toBe(true)
    },
  )
})

describe('the dashboard', () => {
  it('is not bypassed, so a signed-out visitor is sent to sign-in', () => {
    expect(bypass(at('/dashboard'))).toBe(false)
  })
})

describe('the auth screens', () => {
  /**
   * The regression this exists for. They were public routes, which bounces
   * every authenticated session to /dashboard — and a guest is authenticated.
   * /dashboard sends anonymous users back to /try, so "Keep your work" led a
   * guest in a circle and there was no way to make an account from /try at
   * all. They are bypassed now; src/app/auth/layout.tsx does the bouncing,
   * because it can tell an account from a guest.
   */
  it.each(['/auth/sign-in', '/auth/sign-up', '/auth/forgot-password'])(
    '%s is reachable by a guest session, not redirected by the middleware',
    (path) => {
      expect(bypass(at(path))).toBe(true)
    },
  )
})
