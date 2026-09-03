'use client'

import { useQuery } from 'convex/react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import { BYOK_CHANGED_EVENT, getByokKey } from '@/lib/try/byok-client'
import { nextResetAt } from '@/lib/try/pool-day'
import { useAppSelector } from '@/redux/hooks'
import { shapesAdapter } from '@/redux/slice/shapes'

import { api } from '../../../convex/_generated/api'
import { poolBannerLine } from './pool-banner-line'
import { asGuest, type GuestMe } from './types'

const selectors = shapesAdapter.getSelectors()

// Whether the tab holds the visitor's own key, read the way the shell reads
// it. A design written on that key spends nothing of the pool, so the banner
// must not say the free turn is being used while one is on its way.
const subscribeToKey = (onChange: () => void) => {
  window.addEventListener(BYOK_CHANGED_EVENT, onChange)
  return () => window.removeEventListener(BYOK_CHANGED_EVENT, onChange)
}
const keyStoredNow = () => getByokKey() !== null
const keyStoredOnServer = () => false

/**
 * The hero of the /try header: how much of today's community pool is left.
 *
 * `pool.status` is a live query, but a query only re-runs on a write, and
 * midnight is not a write — left alone, the banner would say "used up" for
 * as long as nobody generated. So the clock here is local: once `resetsAt`
 * has passed, the banner shows a full pool and counts towards the next
 * reset, and the first generation of the new day brings the server's
 * numbers back in line.
 *
 * It also reads the canvas. The turn is charged at the click and the design
 * lands most of a minute later; while any design is streaming the line says
 * so, and the "spent" wording waits until there is something to show for it.
 */
export const PoolBanner = ({ me }: { me: GuestMe | null | undefined }) => {
  const status = useQuery(api.pool.status)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(tick)
  }, [])

  // The adapter state, not the array: `selectAll` builds a new array on every
  // call, and a selector that never returns the same reference re-renders on
  // every action on the canvas.
  const entities = useAppSelector((state) => state.shapes.entities)
  const streaming = useMemo(
    () => selectors.selectAll(entities).some((shape) => shape.streaming === true),
    [entities],
  )
  const keyStored = useSyncExternalStore(subscribeToKey, keyStoredNow, keyStoredOnServer)

  if (!status) {
    return <div className="h-9 w-full animate-pulse rounded-lg bg-white/[0.04]" aria-hidden="true" />
  }

  const rolledOver = now >= status.resetsAt
  const resetsAt = rolledOver ? nextResetAt(now) : status.resetsAt
  const remaining = rolledOver ? status.size : status.remaining
  const guest = asGuest(me)
  const guestSpent = guest !== null && guest.poolUsedToday && !rolledOver
  const fraction = status.size > 0 ? remaining / status.size : 0

  const line = poolBannerLine({
    remaining,
    size: status.size,
    resetsIn: resetsAt - now,
    guestSpent,
    canClaimShare: guest?.canClaimShare ?? false,
    inFlight: streaming && !keyStored,
  })

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
