import { NextResponse, type NextRequest } from 'next/server'

import { hashIp, signAdmission } from '@/lib/try/admission'

/**
 * Issues an admission token for a guest session.
 *
 * The anonymous provider in Convex cannot see who is asking, so this is where
 * the network is identified: the address is hashed with the secret, signed
 * into a five-minute token, and the provider counts sessions per hash. The
 * address itself goes nowhere — not into the token, not into a log line.
 *
 * Without the secret (a local clone) the answer is `null` and the provider
 * accepts a sign-in with no token; the throttle is a production concern.
 *
 * Always 200: a refusal here would only tell a script it had found the
 * throttle. The refusal, when it comes, comes from the provider.
 */
const ADMISSION_TTL_MS = 5 * 60_000

/** The caller's address as the platform reports it; behind Vercel that is the first forwarded hop. */
const clientIp = (request: NextRequest) => {
  const forwarded = request.headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  if (first) return first
  const real = request.headers.get('x-real-ip')?.trim()
  return real || '0.0.0.0'
}

export async function POST(request: NextRequest) {
  const secret = process.env.GUEST_ADMISSION_SECRET
  const headers = { 'Cache-Control': 'no-store' }

  if (!secret) return NextResponse.json({ admission: null }, { headers })

  const ipHash = await hashIp(clientIp(request), secret)
  const admission = await signAdmission({ ipHash, exp: Date.now() + ADMISSION_TTL_MS }, secret)
  return NextResponse.json({ admission }, { headers })
}
