import type { Metadata } from 'next'

import { CtaSection } from '@/components/marketing/home/CtaSection'
import { PlanCard } from '@/components/marketing/pricing/PlanCard'
import {
  PRICING_DESCRIPTION,
  PRICING_POINTS,
  PRICING_ROWS,
} from '@/lib/marketing-pricing'
import { pricePhrase } from '@/lib/plan'
import { planPrice } from '@/lib/plan-price'
import { polarConfigured } from '@/lib/polar'

export const metadata: Metadata = {
  title: 'Pricing',
  description: PRICING_DESCRIPTION,
}

/**
 * Re-rendered at most once an hour. The figure on the card is read from
 * Polar through a cache with the same window; a page that never revalidated
 * would print whatever Polar said at build time until the next deploy.
 */
export const revalidate = 3600

export default async function PricingPage() {
  // Null when Polar is not configured, which is production until launch, and
  // on any failure: the card renders whole either way, only without a figure.
  const price = await planPrice()

  return (
    <>
      <section className="section-pad">
        <div className="container-home">
          <div className="mx-auto max-w-[640px] text-center">
            <span className="eyebrow">Pricing</span>
            <h1 className="font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-muted-foreground">
              Pay for generations.{' '}
              <span className="text-foreground">Everything else is free.</span>
            </h1>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-muted-foreground">
              {PRICING_DESCRIPTION}
            </p>
          </div>

          <PlanCard price={price ? pricePhrase(price) : null} checkout={polarConfigured} />

          <div className="mx-auto mt-8 max-w-[720px] overflow-hidden rounded-2xl border border-white/[0.1] bg-surface">
            {PRICING_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-6 border-b border-hairline px-6 py-5 last:border-b-0"
              >
                <span className="text-[1rem] text-foreground">{row.label}</span>
                <span
                  className={
                    row.value === 'Free'
                      ? 'rounded-full border border-white/[0.14] bg-white/[0.06] px-3 py-1 text-[0.8rem] font-medium text-foreground'
                      : 'text-[0.95rem] text-muted-foreground'
                  }
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <ul className="mx-auto mt-12 grid max-w-[960px] gap-4 md:grid-cols-2">
            {PRICING_POINTS.map((point) => (
              <li key={point.title} className="card-surface px-6 py-5">
                <h2 className="font-display text-[1.05rem] font-medium tracking-[-0.02em] text-foreground">
                  {point.title}
                </h2>
                <p className="mt-2.5 text-[0.9rem] leading-relaxed text-muted-foreground">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CtaSection />
    </>
  )
}
