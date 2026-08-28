'use client'

import { useQuery } from 'convex/react'
import { useEffect, useState } from 'react'

import { nextResetAt } from '@/lib/try/pool-day'

import { api } from '../../../convex/_generated/api'
import { formatCountdown } from './countdown'
import { asGuest, type GuestMe } from './types'

/**
 * The hero of the /try header: how much of today's community pool is left.
 *
 * `pool.status` is a live query, but a query only re-runs on a write, and
 * midnight is not a write — left alone, the banner would say "used up" for
 * as long as nobody generated. So the clock here is local: once `resetsAt`
 * has passed, the banner shows a full pool and counts towards the next
 * reset, and the first generation of the new day brings the server's
 * numbers back in line.
 */
export const PoolBanner = ({ me }: { me: GuestMe | null | undefined }) => {
  const status = useQuery(api.pool.status)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(tick)
  }, [])

  if (!status) {
    return <div className="h-9 w-full animate-pulse rounded-lg bg-white/[0.04]" aria-hidden="true" />
  }

  const rolledOver = now >= status.resetsAt
  const resetsAt = rolledOver ? nextResetAt(now) : status.resetsAt
  const remaining = rolledOver ? status.size : status.remaining
  const guest = asGuest(me)
  const guestSpent = guest !== null && guest.poolUsedToday && !rolledOver
  const fraction = status.size > 0 ? remaining / status.size : 0

  let line: string
  if (remaining <= 0) {
    line = `Pool used up — resets in ${formatCountdown(resetsAt - now)}. Add your own key to keep going.`
  } else if (guestSpent) {
    line = guest.canClaimShare
      ? "You've used your free generation today — share on X for 2 more, or add your key."
      : "You've used your free generation today — add your key to keep going."
  } else {
    line = `Community pool · ${remaining} of ${status.size} free generations left today`
  }

  return (
    <div className="flex w-full flex-col gap-1.5" aria-live="polite">
      <p className="truncate text-xs text-foreground/90" title={line}>
        {line}
      </p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-sky-400 transition-[width] duration-500"
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
      </div>
    </div>
  )
}
