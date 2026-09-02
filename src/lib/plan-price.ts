import { unstable_cache } from 'next/cache'

import { asInterval, type PlanPrice } from './plan'
import { polar, polarConfigured } from './polar'

/**
 * The plan's price, read from Polar and cached for an hour.
 *
 * The figure is deliberately not written into the site: Polar is where the
 * price is set, and a number typed into a source file would be quoted by
 * crawlers long after it moved. So /pricing asks Polar at render time, and
 * at most once an hour, which keeps the page static in between and keeps a
 * slow Polar from becoming a slow page.
 *
 * Null in three cases, and the page renders a whole card in all of them:
 * Polar is not configured on this deployment (production until launch), the
 * product has no fixed price, or the read failed. The figure is a nicety on
 * the card; a 500 or a blank would be a pricing page with no pricing on it.
 */
export const PLAN_PRICE_TTL_SECONDS = 3600

type Product = Awaited<ReturnType<typeof polar.products.get>>
type Price = Product['prices'][number]
type FixedPrice = Extract<Price, { amountType: 'fixed' }>

const isLiveFixedPrice = (price: Price): price is FixedPrice =>
  !price.isArchived && price.amountType === 'fixed'

/**
 * Returns a plain object on purpose: `unstable_cache` serialises what it
 * stores, and the SDK's product carries Date instances that would not come
 * back as dates.
 */
const readPlanPrice = async (productId: string): Promise<PlanPrice | null> => {
  const product = await polar.products.get({ id: productId })
  const fixed = product.prices.find(isLiveFixedPrice)
  if (!fixed) return null
  return {
    amount: fixed.priceAmount,
    currency: fixed.priceCurrency,
    interval: asInterval(product.recurringInterval),
    intervalCount: product.recurringIntervalCount ?? 1,
  }
}

export const planPrice = async (): Promise<PlanPrice | null> => {
  const productId = process.env.POLAR_PRODUCT_ID
  if (!polarConfigured || !productId) return null
  try {
    const cached = unstable_cache(readPlanPrice, ['polar-plan-price'], {
      revalidate: PLAN_PRICE_TTL_SECONDS,
    })
    return await cached(productId)
  } catch (error) {
    // Logged, not thrown: the card is rendered without a figure. A sandbox
    // token against production answers 401 here, which is the misconfiguration
    // src/lib/polar.ts warns about, and it is worth a line in the log.
    console.error('[pricing] could not read the plan price from Polar', error)
    return null
  }
}
