import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
    expect(freeWeekHref('/download', true)).toBe('/download')
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
      // Either the file knows about the week, or its auth link is inside a
      // section the week never renders. Only the home page is in the second
      // group, and it is unreachable during the week because `/` redirects.
      const knowsAboutTheWeek = /freeWeek|freeWeekHref/.test(source)
      const isHomeSection = path.includes(join('marketing', 'home'))
      expect(knowsAboutTheWeek || isHomeSection).toBe(true)
    },
  )
})
