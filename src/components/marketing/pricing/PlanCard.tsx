import Link from 'next/link'

import { ArrowRightIcon } from '@/components/marketing/icons'
import { PLAN } from '@/lib/marketing-pricing'

/**
 * The tier card above the credit table.
 *
 * Two states, and both are whole. With `checkout` the card carries whatever
 * figure Polar reported and a pill straight into checkout. Without it, which
 * is every deployment where Polar is not configured, the pill gives way to
 * the footer's email form: the same plain GET to /try, so the address is
 * already filled in when the gate there asks for it. `price` can be null in
 * either state, because a product with no fixed price and a failed read look
 * the same to a visitor, and the card must never wait on Polar to say what a
 * month buys.
 *
 * A server component: nothing here needs state, and the form posts with no
 * script at all.
 */
export function PlanCard({ price, checkout }: { price: string | null; checkout: boolean }) {
  return (
    <div className="card-surface mx-auto mt-12 max-w-[720px] px-6 py-8 text-center md:px-10 md:py-10">
      {price ? (
        <p className="font-display text-[clamp(2.2rem,4.6vw,3.2rem)] leading-none font-medium tracking-[-0.03em] text-foreground">
          {price}
        </p>
      ) : null}
      <h2
        className={`font-display text-[1.35rem] font-medium tracking-[-0.02em] text-foreground ${price ? 'mt-4' : ''}`}
      >
        {PLAN.name}: {PLAN.lead}
      </h2>
      <p className="mx-auto mt-3 max-w-[560px] text-[0.95rem] leading-relaxed text-muted-foreground">
        {PLAN.body}
      </p>

      {checkout ? (
        <Link href={PLAN.checkout.href} className="pill pill-primary mt-8">
          {PLAN.checkout.label} <span aria-hidden>→</span>
        </Link>
      ) : (
        <>
          <p className="mt-8 text-[0.95rem] text-foreground">{PLAN.launch.lead}</p>
          <form
            action={PLAN.launch.action}
            method="get"
            className="mx-auto mt-4 flex max-w-[360px] items-center gap-2"
          >
            <label htmlFor="plan-email" className="sr-only">
              Email
            </label>
            <input
              id="plan-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@studio.com"
              className="h-11 flex-1 rounded-full border border-border bg-transparent px-4 text-[0.9rem] text-foreground outline-none placeholder:text-faint focus:border-white/30"
            />
            <button
              type="submit"
              aria-label="Leave an email"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:-translate-y-0.5"
            >
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-[0.85rem] text-muted-foreground">
        {PLAN.billing.lead}{' '}
        <Link
          href={PLAN.billing.href}
          className="text-foreground underline-offset-4 hover:underline"
        >
          {PLAN.billing.label}
        </Link>
        .
      </p>
    </div>
  )
}
