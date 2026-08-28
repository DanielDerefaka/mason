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

/**
 * A route is in the clear if it spends a credit, or if it says in a comment
 * that not doing so is deliberate.
 *
 * The BYOK comment every route carries ("not charged for, and that is a
 * decision — the visitor pays Anthropic") uses the same words, but it
 * explains why one *kind of request* is free, not why the route is. Today it
 * happens to wrap across two lines and so misses the regex; a reflow that
 * joined it would exempt all eight routes at once. So a line that begins
 * with "BYOK:" is set aside before the exemption is looked for.
 *
 * `chargeForGeneration` counts as spending because it is the one place the
 * spend now lives — six routes each spelled it out identically until it was
 * lifted into `src/lib/generation-charge.ts`. Naming it here would be a way
 * to pass this check with a helper that charged nobody, so the test below
 * reads that file and insists it really does spend.
 */
const spendsOrExplains = (source: string): boolean => {
  const spends = /credits\.spend|chargeForGeneration/.test(source)
  const withoutByok = source
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)\s*BYOK:/.test(line))
    .join('\n')
  // The workflow plan is the one deliberate exception: it refuses unless
  // the whole flow is affordable and every page it plans charges
  // separately. The exemption is spelled out in the route, so a future
  // uncharged route cannot inherit it by accident.
  const explained = /not charged for, and that is a decision/.test(withoutByok)
  return spends || explained
}

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
      expect(spendsOrExplains(route.source)).toBe(true)
    },
  )

  it('has the spend it delegates to', () => {
    // The regression this exists for: moving the spend into a shared helper
    // emptied every route of the words this file was matching on. Accepting
    // the helper's name is only safe while the helper is the thing that
    // charges, so that is asserted rather than assumed.
    const helper = readFileSync(join(process.cwd(), 'src/lib/generation-charge.ts'), 'utf8')
    expect(helper).toMatch(/credits\.spend/)
    expect(helper).toMatch(/credits\.refund/)
  })

  it('does not let the BYOK comment stand in for the exemption', () => {
    // The regression this exists for: the BYOK comment was added to every
    // route with the exemption's own words in it, and only its line-wrapping
    // kept the check above from passing a route that charged nobody.
    const byokOnly = [
      '// BYOK: the request\'s own key, direct to Anthropic; not charged for, and that is a decision — the visitor pays Anthropic.',
      'const result = streamText({ model })',
    ].join('\n')
    expect(spendsOrExplains(byokOnly)).toBe(false)

    // The real exemption, and a real spend, still pass.
    expect(spendsOrExplains(byokOnly + '\n * The plan is not charged for, and that is a decision.')).toBe(true)
    expect(spendsOrExplains(byokOnly + '\nawait fetchMutation(api.credits.spend, {}, { token })')).toBe(true)
  })

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
