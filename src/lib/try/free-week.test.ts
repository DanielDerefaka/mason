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
 * The week is /try and nothing else: sign-up and sign-in both close, and they
 * close in their own layouts.
 *
 * This describe used to be named "closes sign-up, and only sign-up", and the
 * history is worth keeping because the shape of the mistake is not the shape
 * of the rule. `isFreeWeek()` once sat in `src/app/auth/layout.tsx`, the file
 * all three screens share, so closing sign-up closed the password reset with
 * it and left anybody mid-reset with no way to finish and nobody to ask. That
 * is the failure this file still guards: not "sign-in must stay open" but "a
 * shared layout must not decide for children it cannot see".
 *
 * Sign-in closing is the founder's call of 2026-09-03, made knowing the cost:
 * an account created before the week cannot be reached until `FREE_WEEK` is
 * unset. The trade is one surface and one link to it for the length of the
 * week. Sessions already issued are untouched, so this refuses a sign-in
 * rather than signing anybody out.
 */
describe('the free week closes sign-up and sign-in, and nothing else under /auth', () => {
  it.each([['sign-up'], ['sign-in']])('redirects from the %s layout, in its own file', (route) => {
    const layout = withoutComments(read(`src/app/auth/${route}/layout.tsx`))
    expect(layout).toMatch(/isFreeWeek\(\)/)
    expect(layout).toMatch(/redirect\('\/try'\)/)
  })

  it('leaves the shared auth layout with no opinion about the week', () => {
    const layout = withoutComments(read('src/app/auth/layout.tsx'))
    expect(layout).not.toMatch(/isFreeWeek|FREE_WEEK/)
  })

  /**
   * Swept from disk rather than listed, because the regression was a redirect
   * sitting one directory above the route it was meant for. Whatever is under
   * /auth that is not one of the two closed screens must stay open, and a new
   * screen added there has to say for itself which it is.
   */
  const CLOSED = new Set(['sign-up', 'sign-in'])
  const openLayouts = readdirSync(join(process.cwd(), 'src/app/auth'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !CLOSED.has(entry.name))
    .map((entry) => join('src/app/auth', entry.name, 'layout.tsx'))
    .filter((path) => {
      try {
        return statSync(join(process.cwd(), path)).isFile()
      } catch {
        return false
      }
    })

  it.each([['src/app/auth/layout.tsx'], ...openLayouts.map((path) => [path])])(
    '%s does not shut its screen for the week',
    (path) => {
      expect(withoutComments(read(path))).not.toMatch(/isFreeWeek|FREE_WEEK/)
    },
  )

  /**
   * Named rather than swept, because "no layout closed it" is satisfied by a
   * reset screen that has been deleted. The reset is the one door that must be
   * open in both states: a password changed during the week is usable the
   * moment the week ends.
   */
  it('keeps the password reset reachable', () => {
    expect(statSync(join(process.cwd(), 'src/app/auth/forgot-password/page.tsx')).isFile()).toBe(
      true,
    )
    expect(openLayouts).toContain('src/app/auth/forgot-password/layout.tsx')
  })
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

  // Both screens now, not just sign-up: whichever of the two a marketing file
  // links to, that link goes nowhere while the week is on.
  it.each(marketingFiles.map((path) => [path.slice(path.indexOf('src/')), path]))(
    '%s guards any auth link it carries',
    (_label, path) => {
      const source = withoutComments(readFileSync(path, 'utf8'))
      if (!/["'`]\/auth\/sign-(up|in)/.test(source)) return
      expect(/freeWeek/.test(source)).toBe(true)
    },
  )

  /**
   * The same rule for sign-in, since the week closes that screen too: a link
   * to a route that redirects back to the page you are already on is worse
   * than no link. This was the opposite assertion until 2026-09-03, when the
   * week's shape changed; both halves are guarded here so neither can be
   * changed by accident.
   */
  it.each([
    ['the desktop header', 'src/components/marketing/layout/SiteHeader.tsx'],
    ['the mobile menu', 'src/components/marketing/layout/MobileNav.tsx'],
  ])('%s guards its sign-in link on the week', (_label, path) => {
    const source = withoutComments(read(path))
    expect(source).toMatch(/href="\/auth\/sign-in"/)
    expect(source).toMatch(/!freeWeek &&/)
  })

  /**
   * The header cannot read the flag itself: it is a client component and
   * `FREE_WEEK` is deliberately not NEXT_PUBLIC, so a value has to come down
   * from the server layout. A default of `false` on the prop means a forgotten
   * thread shows the link, which is the direction that fails loudly.
   */
  it('threads the flag to the header from the server layout', () => {
    expect(withoutComments(read('src/app/(marketing)/layout.tsx'))).toMatch(
      /<SiteHeader freeWeek=\{freeWeek\}/,
    )
    expect(withoutComments(read('src/components/marketing/layout/SiteHeader.tsx'))).toMatch(
      /<MobileNav[^\n]*freeWeek=\{freeWeek\}/,
    )
  })

  /**
   * The footer drops the links rather than bending them. It used to rewrite
   * every /auth href to /try, which left the words "Sign in" over a link to
   * the canvas: a link with the wrong words on it is worse than no link.
   */
  it('drops both auth links from the footer columns, and bends no href', () => {
    const source = withoutComments(read('src/components/marketing/layout/SiteFooter.tsx'))
    expect(source).toMatch(/link\.href !== "\/auth\/sign-up"/)
    expect(source).toMatch(/link\.href !== "\/auth\/sign-in"/)
    expect(source).not.toMatch(/freeWeekHref/)
  })

  it('has both links in the columns for that filter to remove', () => {
    const hrefs = FOOTER_COLUMNS.flatMap((col) => col.links.map((link) => link.href))
    expect(hrefs).toContain('/auth/sign-up')
    expect(hrefs).toContain('/auth/sign-in')
  })
})

/**
 * The canvas itself, which is the whole product during the week.
 *
 * Every exit from /try that ends at an account has to be gone, not merely
 * reworded: both auth screens redirect back here, so a button offering one is
 * a button that returns you to the page you pressed it on. Pinned from the
 * source because the failure is silent — the link renders, the click works,
 * and the visitor lands exactly where they started with nothing to show for
 * it.
 */
describe('the exits from /try during the week', () => {
  it('does not render "Keep this canvas" at all', () => {
    const source = withoutComments(read('src/components/try/header.tsx'))
    expect(source).toMatch(/const canKeep = !freeWeek &&/)
    expect(source).toMatch(/const \{ freeWeek \} = useGuest\(\)/)
    // Hidden, not disabled: an offer withdrawn at the click is worse than one
    // never made, which is the rule the project export follows too.
    expect(source).toMatch(/\{canKeep && \(/)
  })

  /**
   * The refusal screen is the one place a capped visitor reads carefully, and
   * it used to answer with "Sign in if you already have an account". That is
   * now a redirect back to the screen refusing them.
   */
  it('names no auth route on the network-cap screen', () => {
    const gate = withoutComments(read('src/components/try/guest-gate.tsx'))
    const screen = gate.slice(gate.indexOf("refusal === 'network-cap'"))
    const body = screen.slice(0, screen.indexOf("refusal === 'unknown'"))
    // Every /auth link on that screen sits inside the `freeWeek ? … : …` that
    // replaces them with Explore, so none is reachable during the week.
    const offered = body.slice(body.indexOf('freeWeek ? ('), body.indexOf(') : ('))
    expect(offered).not.toMatch(/\/auth\//)
    expect(offered).toMatch(/\/explore/)
  })

  /**
   * The fourteen-day line is the one fact "Keep this canvas" carried that
   * nothing else did. It has to survive the button going, so the header keeps
   * saying it whether or not the week is on.
   */
  it('still tells a guest how long their work is kept', () => {
    const note = withoutComments(read('src/components/try/retention-note.tsx'))
    expect(note).toMatch(/fourteen days/)
    expect(note).not.toMatch(/freeWeek/)
    expect(withoutComments(read('src/components/try/header.tsx'))).toMatch(
      /\{guest && <RetentionNote \/>\}/,
    )
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
