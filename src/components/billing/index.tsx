'use client'

import { useMutation, useQuery } from 'convex/react'
import { Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/logo-mark'
import { api } from '../../../convex/_generated/api'

const PERKS = [
  '200 credits every month',
  'Style guides from your own mood board',
  'Designs, flows and mobile versions',
  'The editor, and public share links',
]

/**
 * Billing.
 *
 * Polar is the merchant of record: it charges the card, collects and remits
 * VAT and sales tax, and this app never sees a card number. What it sees is a
 * signed webhook, and a mirror of the subscription in Convex.
 */
export const Billing = () => {
  const subscription = useQuery(api.subscriptions.getMine)
  const billingReady = useQuery(api.subscriptions.billingReady)
  const credits = useQuery(api.credits.getBalance)
  const claim = useMutation(api.subscriptions.claimByEmail)

  // Checkout only collects an email, so someone can pay and then sign up — or
  // pay with a different address than the one on the account. This attaches
  // any unclaimed row on the way back from checkout.
  useEffect(() => {
    void claim({}).catch(() => {})
  }, [claim])

  const loading = subscription === undefined

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-16">
      <div className="text-center">
        <LogoMark className="text-foreground mx-auto size-8" />
        <h1 className="mt-6 text-2xl font-semibold">
          {subscription?.active ? 'Your plan' : 'Get Mason'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {subscription?.active
            ? 'Thanks — your subscription is active.'
            : 'A sketch in, a finished screen out. Cancel whenever you like.'}
        </p>
      </div>

      {billingReady === false && (
        <p className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
          <span className="font-medium">This deployment cannot record a payment.</span>{' '}
          POLAR_WEBHOOK_SECRET is set for the app but not on the Convex deployment, so a
          completed checkout would be charged and never activate. Run{' '}
          <code className="font-mono">npx convex env set POLAR_WEBHOOK_SECRET …</code> with
          the same value.
        </p>
      )}

      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Checking your plan…
          </div>
        ) : subscription?.active ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium capitalize">{subscription.status}</span>
              <span className="text-muted-foreground text-xs">
                {credits ?? 0} credits left
              </span>
            </div>

            {subscription.currentPeriodEnd && (
              <p className="text-muted-foreground mt-3 text-xs">
                {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'} on{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Button asChild size="sm">
                <Link href="/dashboard">Go to projects</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href="https://polar.sh/purchases" target="_blank" rel="noreferrer">
                  Manage billing
                </a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <ul className="space-y-2.5">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  {perk}
                </li>
              ))}
            </ul>

            {/* A plain link: checkout is a redirect, and a form post would need
                client JavaScript to do the same thing. */}
            <Button asChild className="mt-6 w-full">
              <a href="/api/polar/checkout">Subscribe</a>
            </Button>

            <p className="text-muted-foreground mt-4 text-center text-[11px] leading-relaxed">
              Payment is handled by Polar, our merchant of record. Taxes are calculated
              and remitted for you.
            </p>
          </>
        )}
      </div>

      <p className="text-muted-foreground mt-6 text-center text-xs">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Back to projects
        </Link>
      </p>
    </main>
  )
}
