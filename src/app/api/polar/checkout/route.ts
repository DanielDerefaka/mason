import { NextResponse, type NextRequest } from 'next/server'

import { CreditsBalanceQuery } from '@/convex/query.config'
import { polar, polarConfigured } from '@/lib/polar'

export const runtime = 'nodejs'

/**
 * Starts a Polar checkout and sends the browser to it.
 *
 * A GET so it can be a plain link — a form post would need client JavaScript
 * for what is really just a redirect.
 *
 * The customer's email is passed through so the webhook can match the
 * subscription to an account. Polar is the merchant of record, so nothing
 * about the card ever reaches this server.
 */
export async function GET(request: NextRequest) {
  if (!polarConfigured) {
    return NextResponse.json(
      { message: 'Billing is not configured on this deployment' },
      { status: 503 },
    )
  }

  try {
    const { ok, profile } = await CreditsBalanceQuery()
    if (!ok || !profile) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url))
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin

    const checkout = await polar.checkouts.create({
      products: [process.env.POLAR_PRODUCT_ID as string],
      successUrl: `${origin}/billing?checkout=done`,
      customerEmail: profile.email ?? undefined,
      // Echoed back on the webhook, so a subscription can be attributed even
      // if the billing email differs from the account's.
      metadata: { userEmail: profile.email ?? '' },
    })

    return NextResponse.redirect(checkout.url)
  } catch (error) {
    console.error('[polar/checkout]', error)
    return NextResponse.json(
      { message: 'Could not start checkout' },
      { status: 500 },
    )
  }
}
