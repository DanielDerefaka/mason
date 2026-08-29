import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CTA } from '../marketing-content'
import { ctaHref, freeWeekHref, isFreeWeek } from './free-week'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the switch', () => {
  it('is off unless the environment says exactly true', () => {
    vi.stubEnv('FREE_WEEK', '')
    expect(isFreeWeek()).toBe(false)
    vi.stubEnv('FREE_WEEK', 'false')
    expect(isFreeWeek()).toBe(false)
    // A typo must not open the week: '1' and 'yes' are not 'true'.
    vi.stubEnv('FREE_WEEK', '1')
    expect(isFreeWeek()).toBe(false)
  })

  it('is on for true', () => {
    vi.stubEnv('FREE_WEEK', 'true')
    expect(isFreeWeek()).toBe(true)
    expect(ctaHref()).toBe('/try')
  })
})

describe('links during the free week', () => {
  /**
   * The regression this exists for: `/auth/*` redirects to /try during the
   * week, and the footer rewrote `/auth/sign-up` only — so "Sign in" sat in
   * the footer of a trial whose whole promise was that no account was needed,
   * and clicking it bounced.
   */
  it.each(['/auth/sign-up', '/auth/sign-in', '/auth/forgot-password'])(
    'sends %s to the free canvas',
    (href) => {
      expect(freeWeekHref(href, true)).toBe('/try')
    },
  )

  it('leaves everything else alone', () => {
    expect(freeWeekHref('/blog', true)).toBe('/blog')
    expect(freeWeekHref('/explore', true)).toBe('/explore')
  })

  it('changes nothing when the week is off', () => {
    expect(freeWeekHref('/auth/sign-up', false)).toBe('/auth/sign-up')
    expect(freeWeekHref('/auth/sign-in', false)).toBe('/auth/sign-in')
  })
})

/**
 * The week's promise, enforced from the filesystem rather than from a list
 * somebody remembers to update.
 *
 * "No account needed" is only true if nothing on the way in offers one. The
 * layout and the marketing chrome each hold a piece of that, and the piece
 * that was missed last time was the quiet one — a "Sign in" link in a footer.
 */
describe('nothing offers an account while the week is on', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

  it('shuts the auth screens in one place, the layout', () => {
    const layout = read('src/app/auth/layout.tsx')
    expect(layout).toMatch(/isFreeWeek\(\)/)
    expect(layout).toMatch(/redirect\('\/try'\)/)
  })

  const marketingFiles = (() => {
    const root = join(process.cwd(), 'src/components/marketing')
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : [path]
      })
    return walk(root)
  })()

  it('has marketing files to check at all', () => {
    expect(marketingFiles.length).toBeGreaterThan(10)
  })

  it.each(marketingFiles.map((path) => [path.slice(path.indexOf('src/')), path]))(
    '%s guards any auth link it carries',
    (_label, path) => {
      const source = readFileSync(path, 'utf8')
      if (!/["'`]\/auth\//.test(source)) return
      // Either the file knows about the week, or its auth link is one the
      // week's own redirect catches: /auth/* goes to /try while the week is
      // on, so a home section linking there lands a visitor on the canvas
      // rather than a shut door. The link is still an account being offered
      // where none is needed, which is a copy problem rather than a broken
      // one — see the closing-call-to-action block below for the case that
      // was neither guarded nor caught.
      const knowsAboutTheWeek = /freeWeek|freeWeekHref/.test(source)
      const isHomeSection = path.includes(join('marketing', 'home'))
      expect(knowsAboutTheWeek || isHomeSection).toBe(true)
    },
  )
})

/**
 * The other half, and the half that has no flag to read: what the site offers
 * when the week is *off*.
 *
 * The regression this exists for: CtaSection closes all seven marketing pages,
 * and it chose its pill on `isFreeWeek()` — /try during the week, and
 * `/auth/sign-up` outside it. So with `FREE_WEEK` unset every marketing page
 * ended in a sign-up wall that the header pill on the same page (`/try`,
 * unconditionally) and the answer on /faq ("No. The canvas at /try runs
 * without one") both said was not needed. /try is public either way, so the
 * flag was never the right thing to ask.
 *
 * Pinned by reading the source rather than by rendering, because what is under
 * test is the absence of a dependency: a component that cannot see the switch
 * cannot be wrong about it in one of its two states, and the state that was
 * wrong is the one nobody was looking at.
 */
describe('the closing call to action', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/marketing/home/CtaSection.tsx'),
    'utf8',
  )

  it('sends everyone to the canvas', () => {
    expect(CTA.primaryCta.href).toBe('/try')
  })

  it('says so, rather than promising a trial and linking to a form', () => {
    expect(CTA.primaryCta.label.toLowerCase()).toContain('free')
    expect(CTA.primaryCta.href).not.toMatch(/^\/auth/)
  })

  it('does not read the free-week switch at all', () => {
    expect(source).not.toMatch(/isFreeWeek|ctaHref|freeWeek/)
  })

  it('offers exactly one link, and no auth route', () => {
    expect(source).not.toMatch(/["'`]\/auth/)
    expect(source.match(/<Link/g)).toHaveLength(1)
  })
})
