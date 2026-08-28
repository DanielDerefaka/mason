'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useEffect, useRef, useState } from 'react'

/**
 * Gives a signed-out visitor an anonymous session.
 *
 * The admission ticket comes from /api/try/admit, which is where the daily
 * cap on new guests lives; the anonymous provider refuses a sign-in that
 * does not carry one when the cap is on. The attempt is guarded by a ref
 * rather than state because strict mode runs effects twice and a second
 * admission would burn a second ticket for the same person.
 *
 * `ready` is simply "authenticated" — a real user who lands here is ready at
 * once and never sees the admit call.
 */
export const useGuestSession = () => {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { signIn } = useAuthActions()
  const attempted = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (isLoading || isAuthenticated || attempted.current) return
    attempted.current = true

    const admit = async () => {
      try {
        const response = await fetch('/api/try/admit', { method: 'POST' })
        const { admission } = response.ok
          ? ((await response.json()) as { admission?: string | null })
          : { admission: null }
        await signIn('anonymous', admission ? { admission } : {})
      } catch {
        setFailed(true)
      }
    }
    void admit()
  }, [isLoading, isAuthenticated, signIn])

  return { ready: isAuthenticated, failed }
}
