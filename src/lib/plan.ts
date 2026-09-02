/**
 * The one paid plan, as numbers the site and the backend both read.
 *
 * `CREDITS_PER_PERIOD` is what the Polar webhook grants when a period is paid
 * for, and it is also the figure /pricing and /billing print. It lived in
 * convex/subscriptions.ts alone, and the pages that quoted it each wrote
 * "200" by hand: right until the day the grant changed and the pages did
 * not. Convex imports it from here the way convex/lib/pool.ts imports its
 * limits, so there is one number and the copy is built from it.
 */
export const CREDITS_PER_PERIOD = 200

/** What Polar reports about the plan's price, reduced to what gets printed. */
export type PlanPrice = {
  /** In the currency's minor unit, as Polar stores it: 1200 is $12.00. */
  amount: number
  /** ISO 4217, in whichever case Polar sent it. */
  currency: string
  /** Polar's recurring interval, or null for a one-off product. */
  interval: 'day' | 'week' | 'month' | 'year' | null
  intervalCount: number
}

const INTERVALS = ['day', 'week', 'month', 'year'] as const

/** Polar's interval is an open enum; anything it adds later prints as no period. */
export const asInterval = (value: string | null | undefined): PlanPrice['interval'] =>
  (INTERVALS as readonly string[]).includes(value ?? '')
    ? (value as PlanPrice['interval'])
    : null

/**
 * "$12 a month": the amount in its currency, whole when it is whole, and the
 * period in words. A visitor reads this, so it is copy: "a month" rather
 * than "/mo", and nothing in it a crawler would misquote.
 */
export const pricePhrase = ({ amount, currency, interval, intervalCount }: PlanPrice): string => {
  const whole = amount % 100 === 0
  const money = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount / 100)
  if (!interval) return money
  const period = intervalCount > 1 ? `every ${intervalCount} ${interval}s` : `a ${interval}`
  return `${money} ${period}`
}
