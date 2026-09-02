import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PlanCard } from '@/components/marketing/pricing/PlanCard'
import { CREDITS, CTA } from './marketing-content'
import { FAQ_ENTRIES } from './marketing-faq'
import { PLAN, PRICING_ROWS } from './marketing-pricing'
import { CREDITS_PER_PERIOD, pricePhrase } from './plan'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

/** A number, read out of the file that enforces it rather than typed here twice. */
const constant = (path: string, name: string): number => {
  const match = read(path).match(new RegExp(`\\b${name} = (\\d+)\\b`))
  if (!match) throw new Error(`${name} is not a plain number in ${path}`)
  return Number(match[1])
}

/** The copy spells its numbers out, so the constants are checked as words. */
const WORDS: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three', 5: 'five', 10: 'ten' }
const inWords = (n: number): string => {
  const word = WORDS[n]
  if (!word) throw new Error(`${n} has no word here: add one, then reread every sentence that quotes it`)
  return word
}

const render = (props: Parameters<typeof PlanCard>[0]) => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(createElement(PlanCard, props))
  return host
}

const links = (host: HTMLElement) =>
  [...host.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.textContent?.trim()])

/**
 * The page and the backend are one claim made in two places, and every
 * number on the pricing surface is read here from the code that enforces it.
 * The old "Paid plans" card said prices were on the billing page; the billing
 * page said "200 credits every month" by hand; the webhook granted 200 from a
 * constant of its own. Three places, no check.
 */
describe('the plan quotes the credits the webhook grants', () => {
  it('convex/subscriptions.ts reads the number from src/lib/plan.ts, not a copy', () => {
    const source = read('convex/subscriptions.ts')
    expect(source).toMatch(/import \{ CREDITS_PER_PERIOD \} from '\.\.\/src\/lib\/plan'/)
    expect(source).not.toMatch(/CREDITS_PER_PERIOD = \d/)
  })

  it('the card lead and the pill carry that number', () => {
    expect(PLAN.lead).toBe(`${CREDITS_PER_PERIOD} credits a month.`)
    expect(PLAN.checkout.label).toBe(`Get ${CREDITS_PER_PERIOD} credits a month`)
    expect(PLAN.body).toBe(
      'Style guides from your own mood board, designs, flows and mobile versions, the editor and public share links. Cancel whenever you like.',
    )
  })

  it('/billing lists the same number from the same constant', () => {
    expect(read('src/components/billing/index.tsx')).toContain(
      '`${CREDITS_PER_PERIOD} credits every month`',
    )
  })

  it('sends checkout a ref, never a utm', () => {
    expect(PLAN.checkout.href).toBe('/api/polar/checkout?ref=pricing')
    expect(PLAN.checkout.href).not.toMatch(/utm_/)
  })
})

/**
 * Polar is not configured in production until launch, so the card's other
 * half is the one every visitor sees today. It used to be nothing: the page
 * pointed at billing, behind a sign-in the free week has closed.
 */
describe('the plan card is whole with or without Polar', () => {
  it('with Polar: the figure, the pill into checkout, and no form', () => {
    const host = render({ price: '$12 a month', checkout: true })
    expect(host.textContent).toContain(`The SketchMason plan: ${CREDITS_PER_PERIOD} credits a month.`)
    expect(host.textContent).toContain('$12 a month')
    expect(links(host)).toContainEqual([PLAN.checkout.href, `Get ${CREDITS_PER_PERIOD} credits a month →`])
    expect(host.querySelector('form')).toBeNull()
  })

  it('without Polar: the launch line and the footer\'s email form, and no checkout', () => {
    const host = render({ price: null, checkout: false })
    expect(host.textContent).toContain(`The SketchMason plan: ${CREDITS_PER_PERIOD} credits a month.`)
    expect(host.textContent).toContain('Plans open at launch. Leave an email and we will tell you.')
    const form = host.querySelector('form')
    expect(form?.getAttribute('action')).toBe('/try')
    expect(form?.getAttribute('method')).toBe('get')
    expect(form?.querySelector('input[name="email"][type="email"]')).not.toBeNull()
    expect(links(host).map(([href]) => href)).not.toContain(PLAN.checkout.href)
  })

  it('with Polar but no figure: still the pill, never a blank', () => {
    const host = render({ price: null, checkout: true })
    expect(links(host).map(([href]) => href)).toContain(PLAN.checkout.href)
    expect(host.textContent).not.toContain('null')
  })

  it('demotes billing to a line for people who already pay', () => {
    for (const checkout of [true, false]) {
      const host = render({ price: null, checkout })
      expect(host.textContent).toContain('Already subscribed? Open billing.')
      expect(links(host)).toContainEqual(['/billing', 'Open billing'])
    }
  })

  it('the email form is the footer\'s, field for field', () => {
    const footer = read('src/components/marketing/layout/SiteFooter.tsx')
    expect(footer).toMatch(/const startHref = "\/try"/)
    expect(footer).toMatch(/action=\{startHref\}/)
    expect(footer).toMatch(/name="email"/)
    expect(PLAN.launch.action).toBe('/try')
  })
})

describe('the price is a phrase a visitor can read', () => {
  it.each([
    [{ amount: 1200, currency: 'usd', interval: 'month', intervalCount: 1 }, '$12 a month'],
    [{ amount: 1250, currency: 'USD', interval: 'year', intervalCount: 1 }, '$12.50 a year'],
    [{ amount: 900, currency: 'eur', interval: null, intervalCount: 1 }, '€9'],
    [{ amount: 3000, currency: 'gbp', interval: 'month', intervalCount: 3 }, '£30 every 3 months'],
  ] as const)('%j prints as %s', (price, phrase) => {
    expect(pricePhrase(price)).toBe(phrase)
  })
})

/**
 * Read from the source, because what is under test is where the figure comes
 * from. A page that called Polar on every request would be as slow as Polar,
 * and a page that never revalidated would hold the build-time figure until
 * the next deploy.
 */
describe('the figure comes from Polar through an hourly cache, never from the page', () => {
  it('the read is cached for an hour and returns null rather than throwing', () => {
    const source = read('src/lib/plan-price.ts')
    expect(source).toMatch(/PLAN_PRICE_TTL_SECONDS = 3600/)
    expect(source).toMatch(/unstable_cache\(readPlanPrice/)
    expect(source).toMatch(/revalidate: PLAN_PRICE_TTL_SECONDS/)
    expect(source).toMatch(/if \(!polarConfigured \|\| !productId\) return null/)
    expect(source).toMatch(/catch \(error\) \{[\s\S]*return null/)
  })

  it('the page revalidates on the same clock and never reaches Polar itself', () => {
    const page = read('src/app/(marketing)/pricing/page.tsx')
    expect(page).toMatch(/^export const revalidate = 3600$/m)
    expect(page).not.toMatch(/polar\.products|@polar-sh/)
  })

  it('no source file on the pricing surface types a figure', () => {
    for (const path of [
      'src/lib/marketing-pricing.ts',
      'src/components/marketing/pricing/PlanCard.tsx',
      'src/app/(marketing)/pricing/page.tsx',
    ]) {
      expect(read(path)).not.toMatch(/[$£€]\s?\d/)
    }
  })
})

/**
 * The free offer, in three numbers, each read from the code that enforces
 * it. The closing pitch on every marketing page used to promise "the first
 * style guide and screen", which is two generations to a guest who gets one.
 */
describe('the free offer is the offer the code makes', () => {
  const share = constant('convex/guest.ts', 'SHARE_BONUS')
  const starting = constant('convex/credits.ts', 'STARTING_CREDITS')

  it('one a day is the pool\'s rule, per guest', () => {
    expect(read('convex/lib/pool.ts')).toContain('guest.lastPoolDay !== dayKey(now)')
  })

  it('ten generations is ten credits only while a generation costs one', () => {
    expect(constant('convex/credits.ts', 'GENERATION_COST')).toBe(1)
  })

  it('the closing pitch', () => {
    expect(CTA.body).toBe(
      `Free to start. One generation a day is on us, ${inWords(share)} more if you share it, and an account starts you with ${inWords(starting)}.`,
    )
  })

  it('the FAQ answer, including that a key removes the limit', () => {
    const entry = FAQ_ENTRIES.find((e) => e.question === 'How many free generations are there?')
    expect(entry?.answer).toBe(
      `The community pool gives every guest one a day, and it is shared by the whole site, so a busy day can run dry before you arrive. Sharing a design on X adds ${inWords(share)}. An account starts with ${inWords(starting)}, and your own Anthropic key removes the limit. No card needed.`,
    )
    // A generation on the visitor's own key is not charged.
    expect(read('src/lib/generation-charge.ts')).toMatch(/if \(byok\) \{/)
  })

  it('the table row about a new account', () => {
    expect(PRICING_ROWS).toContainEqual({
      label: `A new account starts with ${inWords(starting)} generations`,
      value: 'No card needed',
    })
  })

  /**
   * "No card needed" is true only while a new account can spend before it
   * subscribes. `BILLING_ENFORCED` sends an unsubscribed account to /billing
   * from the dashboard; it is documented as off and must stay off by default.
   */
  it('no card needed, because billing is not enforced by default', () => {
    expect(read('src/convex/query.config.ts')).toMatch(/entitled: enforced \? subscribed : true/)
    expect(read('.env.example')).not.toMatch(/^BILLING_ENFORCED=true/m)
  })

  it('the pool size is the one figure left out, because it moves without a deploy', () => {
    const pool = constant('convex/lib/pool.ts', 'DEFAULT_POOL_SIZE')
    const copy = [CTA.body, ...FAQ_ENTRIES.map((e) => e.answer), ...PRICING_ROWS.map((r) => r.label)]
    for (const text of copy) {
      expect(text).not.toMatch(new RegExp(`\\b${pool}\\b|\\btwenty\\b`))
    }
  })
})

/**
 * The home page's credit table and /pricing's were two hand-copied lists.
 * They are one list now, and this holds it there.
 */
describe('the credit table is one list shown twice', () => {
  it('/ renders the rows /pricing renders, by reference', () => {
    expect(CREDITS.rows).toBe(PRICING_ROWS)
  })
})
