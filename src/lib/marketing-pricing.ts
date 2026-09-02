import { CREDITS_PER_PERIOD } from './plan'

/**
 * The public pricing page.
 *
 * No dollar figure is written here. The price lives in Polar, behind
 * POLAR_PRODUCT_ID, and a number typed into this file would be quoted by
 * crawlers after the product moved; `src/lib/plan-price.ts` reads it at
 * render time instead, an hour at a time. What is written is the shape of
 * the plan, built from the constant the webhook grants, so the page and the
 * ledger cannot disagree about what a month buys.
 */

export const PRICING_DESCRIPTION =
  'SketchMason charges for generations, not for drawing. Guests can try the canvas without an account. Signed-in plans are on the billing page.'

/**
 * The one paid tier. The lead and the pill both take their number from
 * `CREDITS_PER_PERIOD`; `marketing-pricing.test.ts` holds the wording.
 */
export const PLAN = {
  name: 'The SketchMason plan',
  lead: `${CREDITS_PER_PERIOD} credits a month.`,
  body: 'Style guides from your own mood board, designs, flows and mobile versions, the editor and public share links. Cancel whenever you like.',
  // `ref`, not `utm_*`: a utm on an internal hop re-labels the session's
  // source in analytics, and a visitor who came from X would be filed under
  // the pricing page from this click on.
  checkout: {
    label: `Get ${CREDITS_PER_PERIOD} credits a month`,
    href: '/api/polar/checkout?ref=pricing',
  },
  // In place of the pill while Polar is not configured, which is production
  // until launch. The form is the footer's: a plain GET to /try, where the
  // email gate reads `?email=` and the address goes on the launch list.
  launch: {
    lead: 'Plans open at launch. Leave an email and we will tell you.',
    action: '/try',
  },
  billing: { lead: 'Already subscribed?', label: 'Open billing', href: '/billing' },
}

/**
 * Shown on / and on /pricing from this one list. "Ten" is `STARTING_CREDITS`
 * in convex/credits.ts, spelt out because the rest of the row is words; the
 * test reads the constant and fails if they part.
 */
export const PRICING_ROWS: { label: string; value: string }[] = [
  { label: 'Style guide from a mood board', value: '1 credit' },
  { label: 'Screen from a sketch', value: '1 credit' },
  { label: 'Each page in a generated flow', value: '1 credit' },
  { label: 'Revision from the design chat', value: '1 credit' },
  { label: 'Canvas, references, history', value: 'Free' },
  { label: 'A new account starts with ten generations', value: 'No card needed' },
]

export const PRICING_POINTS: { title: string; body: string }[] = [
  {
    title: 'Try without an account',
    body: 'The canvas at /try lets you draw, generate and edit as a guest. Guests get one generation a day from a pool the whole site shares. Downloading asks for an email once. That address goes on the launch list and the newsletter.',
  },
  {
    title: 'Bring your own key',
    body: 'Paste an Anthropic API key into the canvas and generations run on it. The key stays in the browser tab and is gone when the tab closes. SketchMason never stores it.',
  },
  {
    title: 'Keep the work',
    body: 'A guest session and the projects made in it are kept for fourteen days in the browser you drew in. Making an account keeps the work: the project moves across with its history and its share links.',
  },
  {
    title: 'Paid plans',
    body: `One plan: ${CREDITS_PER_PERIOD} credits a month. The price is read from the payment provider rather than written into this site, so it cannot drift from what you are charged. Cancel whenever you like.`,
  },
]
