import type { Metadata } from 'next'
import Link from 'next/link'

import { CtaSection } from '@/components/marketing/home/CtaSection'
import {
  PRICING_DESCRIPTION,
  PRICING_POINTS,
  PRICING_ROWS,
} from '@/lib/marketing-pricing'

export const metadata: Metadata = {
  title: 'Pricing',
  description: PRICING_DESCRIPTION,
}

export default function PricingPage() {
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

          <div className="mx-auto mt-12 max-w-[720px] overflow-hidden rounded-2xl border border-white/[0.1] bg-surface">
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

          <p className="mx-auto mt-10 max-w-[640px] text-center text-[0.9rem] text-muted-foreground">
            Already have an account?{' '}
            <Link href="/billing" className="text-foreground underline-offset-4 hover:underline">
              Open billing
            </Link>
            .
          </p>
        </div>
      </section>
      <CtaSection />
    </>
  )
}
