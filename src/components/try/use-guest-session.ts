'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useEffect, useRef, useState } from 'react'

import { track } from '@/lib/analytics'
import { refusalFrom, refusalFromSignIn, type GuestRefusal } from '@/lib/try/guest-refusal'

/**
 * Gives a signed-out visitor an anonymous session — when asked to.
 *
 * The admission ticket comes from /api/try/admit, which is where the daily
 * cap on new guests lives; the anonymous provider refuses a sign-in that
 * does not carry one when the cap is on. The attempt is guarded by a ref
 * rather than state because strict mode runs effects twice and a second
 * admission would burn a second ticket for the same person.
 *
 * `ready` is simply "authenticated" — a real user who lands here is ready at
 * once and never sees the admit call.
 *
 * `admit: false` uses a session and never creates one. /try/editor and
 * /try/preview are that case: both read a project out of the URL, so they are
 * useful only to the browser that already owns it, and a browser that does not
 * have a session does not own a project either. Minting one there spent a slot
 * of the network's daily allowance to render an empty room — and on a network
 * already at the cap, it showed the refusal screen to somebody who had only
 * opened their own preview on a second monitor.
 *
 * A refusal comes back classified rather than as a bare boolean: hitting the
 * per-network cap and losing the request are the same failure to this hook and
 * opposite advice to the person reading the screen.
 */
export const useGuestSession = ({ admit = true }: { admit?: boolean } = {}) => {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { signIn } = useAuthActions()
  const attempted = useRef(false)
  const [refusal, setRefusal] = useState<GuestRefusal | null>(null)

  useEffect(() => {
    if (!admit || isLoading || isAuthenticated || attempted.current) return
    attempted.current = true

    const openSession = async () => {
      try {
        const response = await fetch('/api/try/admit', { method: 'POST' })
        const { admission } = response.ok
          ? ((await response.json()) as { admission?: string | null })
          : { admission: null }
        // A refusal arrives as a sign-in that produced no tokens rather than
        // as a throw: the /api/auth proxy flattens a ConvexError into its
        // masked message, so nothing thrown can carry a reason. See
        // `src/lib/try/guest-refusal.ts`.
        const refused = refusalFromSignIn(await signIn('anonymous', admission ? { admission } : {}))
        setRefusal(refused)
        if (refused) track('guest_refused', { reason: refused })
        else track('guest_admitted')
      } catch (error) {
        const refused = refusalFrom(error)
        setRefusal(refused)
        track('guest_refused', { reason: refused })
      }
    }
    void openSession()
  }, [admit, isLoading, isAuthenticated, signIn])

  // Settled and signed out. Only reachable with `admit: false`, and it is not
  // a failure — it is a page that belongs to a session this browser has not
  // got, which is a different sentence from any refusal.
  const sessionless = !admit && !isLoading && !isAuthenticated

  return { ready: isAuthenticated, refusal, sessionless }
}
