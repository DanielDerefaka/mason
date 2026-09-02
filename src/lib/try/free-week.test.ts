import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CTA, HERO } from '../marketing-content'
import { FOOTER_COLUMNS } from '../marketing-nav'
import { heroSecondaryCta, isFreeWeek } from './free-week'

afterEach(() => {
  vi.unstubAllEnvs()
})

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

/** Source with its comments removed, so a comment cannot satisfy a guard. */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(\/\/|\{?\s*\/\*).*$/gm, '')

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
  })
})

/**
 * What shipped broken: `isFreeWeek()` sent every /auth screen to /try from the
 * layout all three share, sign-in included, on the theory that half a door is
 * worse than none. What it shut was every account made before the week began.
 * A subscriber who pressed "Sign in" landed on the guest canvas with no way
 * back to their own work, for seven days, while the header still showed the
 * link.
 *
 * The week's promise is that nothing *needs* an account. That is a fact about
 * /try, not a reason to lock out the people who already have one.
 */
describe('the free week closes sign-up, and only sign-up', () => {
  it('redirects from the sign-up layout, the one route it applies to', () => {
    const layout = withoutComments(read('src/app/auth/sign-up/layout.tsx'))
    expect(layout).toMatch(/isFreeWeek\(\)/)
    expect(layout).toMatch(/redirect\('\/try'\)/)
  })

  it('leaves the shared auth layout with no opinion about the week', () => {
    const layout = withoutComments(read('src/app/auth/layout.tsx'))
    expect(layout).not.toMatch(/isFreeWeek|FREE_WEEK/)
  })

  /**
   * Swept from disk rather than listed, because the regression was a redirect
   * sitting one directory above the route it was meant for. Sign-in and the
   * password reset must stay open, so no layout of theirs may read the flag.
   */
  const authLayouts = readdirSync(join(process.cwd(), 'src/app/auth'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'sign-up')
    .map((entry) => join('src/app/auth', entry.name, 'layout.tsx'))
    .filter((path) => {
      try {
        return statSync(join(process.cwd(), path)).isFile()
      } catch {
        return false
      }
    })

  it.each([['src/app/auth/layout.tsx'], ...authLayouts.map((path) => [path])])(
    '%s does not shut its screen for the week',
    (path) => {
      expect(withoutComments(read(path))).not.toMatch(/isFreeWeek|FREE_WEEK/)
    },
  )
})

/**
 * The hero's second pill, label and destination as one value.
 *
 * They used to travel apart: the label came from `marketing-content.ts` and
 * the href from a `ctaHref()` here, so during the week the pill read "Create
 * an account" and opened the guest canvas. A pill whose words and destination
 * are chosen in two files can disagree; one that returns both cannot.
 */
describe("the hero's second pill", () => {
  it('offers Explore during the week, never a form that is shut', () => {
    vi.stubEnv('FREE_WEEK', 'true')
    const cta = heroSecondaryCta()
    expect(cta.href).toBe('/explore')
    expect(cta.href).not.toMatch(/^\/auth/)
    expect(cta.label.toLowerCase()).not.toContain('account')
  })

  it('offers the account outside the week, with the words that go with it', () => {
    vi.stubEnv('FREE_WEEK', 'false')
    expect(heroSecondaryCta()).toEqual({
      label: HERO.cta.secondary.label,
      href: '/auth/sign-up',
    })
  })

  it('never sends the primary and secondary pills to the same place', () => {
    for (const flag of ['true', 'false']) {
      vi.stubEnv('FREE_WEEK', flag)
      expect(heroSecondaryCta().href, flag).not.toBe(HERO.cta.primary.href)
    }
  })
})

/**
 * "No account needed" is only true if nothing on the way in offers one while
 * the week is on. The piece that was missed last time was the quiet one, a
 * link in a footer, so this reads the marketing tree from disk.
 */
describe('the marketing chrome during the week', () => {
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
    '%s guards any sign-up link it carries',
    (_label, path) => {
      const source = withoutComments(readFileSync(path, 'utf8'))
      if (!/["'`]\/auth\/sign-up/.test(source)) return
      expect(/freeWeek/.test(source)).toBe(true)
    },
  )

  /**
   * The other direction, and the one nobody thinks to test: sign-in must be
   * offered without a condition on it. A `!freeWeek &&` around either of these
   * links is the regression coming back.
   */
  it.each([
    ['the desktop header', 'src/components/marketing/layout/SiteHeader.tsx'],
    ['the mobile menu', 'src/components/marketing/layout/MobileNav.tsx'],
  ])('%s offers sign-in unconditionally', (_label, path) => {
    const source = withoutComments(read(path))
    expect(source).toMatch(/href="\/auth\/sign-in"/)
    expect(source).not.toMatch(/freeWeek/)
  })

  /**
   * The footer drops the link rather than bending it. It used to rewrite every
   * /auth href to /try, which left the words "Sign in" over a link to the
   * canvas: a link with the wrong words on it is worse than no link.
   */
  it('drops Create account from the footer columns, and bends no href', () => {
    const source = withoutComments(read('src/components/marketing/layout/SiteFooter.tsx'))
    expect(source).toMatch(/filter\(\(link\) => link\.href !== "\/auth\/sign-up"\)/)
    expect(source).not.toMatch(/freeWeekHref/)
  })

  it('has a Create account link in the columns for that filter to remove', () => {
    const hrefs = FOOTER_COLUMNS.flatMap((col) => col.links.map((link) => link.href))
    expect(hrefs).toContain('/auth/sign-up')
  })
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
  const source = read('src/components/marketing/home/CtaSection.tsx')

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
