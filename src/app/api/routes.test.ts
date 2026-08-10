import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The rule that keeps the last two billing holes from coming back.
 *
 * Twice now a route has reached the model without charging for it: the old
 * /api/ai endpoint, and the reference brief, which fired on upload and was
 * free to trigger repeatedly by adding an image. Both were found by reading
 * the code months later. Neither was found by anything that runs.
 *
 * So the invariant is enforced from the filesystem rather than from a list
 * somebody remembers to update: any route that can reach a model must check
 * the caller, and must either spend a credit or say in a comment why it does
 * not. A new route is opted in by existing.
 */
const API_ROOT = join(process.cwd(), 'src/app/api')

const routeFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return routeFiles(path)
    return entry === 'route.ts' ? [path] : []
  })

const routes = routeFiles(API_ROOT).map((path) => ({
  path,
  name: `/${path.slice(path.indexOf('src/app/') + 8).replace(/\/route\.ts$/, '')}`.replace(
    '/api',
    '/api',
  ),
  source: readFileSync(path, 'utf8'),
}))

/** A route reaches a model if it calls the AI SDK. */
const generationRoutes = routes.filter(
  ({ source }) => /\b(streamText|generateText|generateObject)\s*\(/.test(source),
)

describe('the API surface', () => {
  it('has generation routes to check at all', () => {
    // Guards the guard: a rename that made the detection stop matching would
    // otherwise turn this whole file into a silent pass.
    expect(generationRoutes.length).toBeGreaterThanOrEqual(6)
  })

  it.each(generationRoutes.map((route) => [route.name, route]))(
    '%s identifies the caller',
    (_name, route) => {
      // CreditsBalanceQuery is the usual form: it reads the session token and
      // answers ok:false when there is nobody behind the request.
      expect(route.source).toMatch(
        /CreditsBalanceQuery|convexAuthNextjsToken|getAuthUserId|auth\(/,
      )
    },
  )

  it.each(generationRoutes.map((route) => [route.name, route]))(
    '%s identifies the caller before it validates the body',
    (_name, route) => {
      // All seven routes used to validate first, so an anonymous POST with a
      // malformed body got a 400 describing what the route wanted. Nothing
      // leaked and nothing was spent, but it meant the identity check ran
      // after work had already been done on untrusted input — and it made
      // "does the guard fire" untestable from outside, because the refusal
      // arrived as a 400 rather than a 401.
      const authenticates = route.source.search(/CreditsBalanceQuery\(\)/)
      const validates = route.source.search(/status: 400/)

      if (validates === -1) return
      expect(authenticates).toBeGreaterThan(-1)
      expect(authenticates).toBeLessThan(validates)
    },
  )

  it.each(generationRoutes.map((route) => [route.name, route]))(
    '%s either spends a credit or explains why not',
    (_name, route) => {
      const spends = /credits\.spend/.test(route.source)
      // The workflow plan is the one deliberate exception: it refuses unless
      // the whole flow is affordable and every page it plans charges
      // separately. The exemption is spelled out in the route, so a future
      // uncharged route cannot inherit it by accident.
      const explained = /not charged for, and that is a decision/.test(route.source)

      expect(spends || explained).toBe(true)
    },
  )

  it.each(generationRoutes.map((route) => [route.name, route]))(
    '%s is rate limited',
    (_name, route) => {
      expect(route.source).toMatch(/rateLimit|checkRateLimit/)
    },
  )

  it('lists every generation route in the smoke script', () => {
    // The smoke script asserts each of these refuses an anonymous POST. A
    // route missing from it is a route nobody checks.
    const smoke = readFileSync(join(process.cwd(), 'scripts/smoke.mjs'), 'utf8')

    for (const route of generationRoutes) {
      expect(smoke, `${route.name} is missing from scripts/smoke.mjs`).toContain(
        `'${route.name}'`,
      )
    }
  })
})
