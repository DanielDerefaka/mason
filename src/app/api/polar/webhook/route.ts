import { NextResponse, type NextRequest } from 'next/server'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'
import { fetchMutation } from 'convex/nextjs'

import { api } from '../../../../../convex/_generated/api'

export const runtime = 'nodejs'

/**
 * Polar's webhook.
 *
 * Unauthenticated by necessity — Polar has no session — so the signature is
 * the only thing standing between this and anyone granting themselves a
 * subscription. It is verified against the raw body before a single field is
 * read, and an unverified request is rejected without touching the database.
 *
 * The route is in `isBypassRoute` for the same reason: the auth middleware
 * would otherwise redirect Polar to the sign-in page and every event would
 * silently fail.
 */

/** Events that mean a period has been paid for, not merely changed. */
const GRANTS_CREDITS = new Set([
  'subscription.created',
  'subscription.active',
  'order.paid',
])

const asTimestamp = (value: unknown): number | undefined => {
  if (!value) return undefined
  const date = new Date(value as string)
  return Number.isNaN(date.getTime()) ? undefined : date.getTime()
}

export async function POST(request: NextRequest) {
  const secret = process.env.POLAR_WEBHOOK_SECRET
  if (!secret) {
    console.error('[polar/webhook] POLAR_WEBHOOK_SECRET is not set')
    return NextResponse.json({ message: 'Not configured' }, { status: 503 })
  }

  // The raw text, not the parsed body: the signature covers the exact bytes,
  // so re-serialising JSON would invalidate it.
  const body = await request.text()

  let event: { type: string; data: Record<string, unknown> }
  try {
    event = validateEvent(
      body,
      Object.fromEntries(request.headers.entries()),
      secret,
    ) as { type: string; data: Record<string, unknown> }
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ message: 'Invalid signature' }, { status: 403 })
    }
    console.error('[polar/webhook]', error)
    return NextResponse.json({ message: 'Bad payload' }, { status: 400 })
  }

  try {
    // Polar's payload shapes differ per event; only the fields read below
    // are relied on, and every one is optional.
    type PolarPayload = {
      id?: string
      status?: string
      customerId?: string
      productId?: string
      subscriptionId?: string
      currentPeriodEnd?: string
      cancelAtPeriodEnd?: boolean
      customer?: { email?: string }
      metadata?: { userEmail?: string }
      subscription?: PolarPayload
    }
    const data = event.data as PolarPayload

    // An order carries its subscription nested; a subscription event is the
    // subscription itself.
    const subscription = data.subscription ?? data
    const subscriptionId: string | undefined =
      subscription?.id ?? data.subscriptionId ?? undefined

    if (!subscriptionId) {
      // Events we do not model — a one-off order, a benefit grant. Answering
      // 200 stops Polar retrying something we will never handle.
      return NextResponse.json({ received: true, ignored: event.type })
    }

    const email: string | undefined =
      subscription?.customer?.email ??
      data.customer?.email ??
      (subscription?.metadata?.userEmail as string | undefined) ??
      (data.metadata?.userEmail as string | undefined)

    await fetchMutation(api.subscriptions.upsertFromPolar, {
      // The mutation is public because fetchMutation cannot reach internal
      // functions; this is what keeps it from being an open door.
      secret,
      polarSubscriptionId: String(subscriptionId),
      polarCustomerId: subscription?.customerId ?? data.customerId ?? undefined,
      polarProductId: subscription?.productId ?? data.productId ?? undefined,
      email,
      // A cancellation event carries the old status, so it is derived from the
      // event type rather than trusted from the payload.
      status:
        event.type === 'subscription.canceled' || event.type === 'subscription.revoked'
          ? 'canceled'
          : (subscription?.status ?? 'active'),
      currentPeriodEnd: asTimestamp(subscription?.currentPeriodEnd),
      cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
      grantCredits: GRANTS_CREDITS.has(event.type),
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    // The specific failure worth naming: the signature verified, so Polar is
    // configured correctly, and Convex still refused the write. That is the
    // deployment missing its copy of the secret, and retrying cannot fix it.
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Not authorised')) {
      console.error(
        '[polar/webhook] CONFIG: the signature verified but Convex rejected the write. ' +
          'Set POLAR_WEBHOOK_SECRET on the Convex deployment as well as in Next: ' +
          'npx convex env set POLAR_WEBHOOK_SECRET <the same value>',
      )
    }
    console.error('[polar/webhook] handling', event.type, error)
    // A 500 tells Polar to retry, which is what we want for a transient
    // Convex failure.
    return NextResponse.json({ message: 'Handler failed' }, { status: 500 })
  }
}
