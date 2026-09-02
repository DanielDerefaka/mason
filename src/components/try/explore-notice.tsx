'use client'

import { useGuest } from './guest-context'

/**
 * Says before the first Generate what the shell does after it.
 *
 * A guest's finished design is published to Explore without being asked.
 * That is the price of the free pool, and `shell.tsx` said so only in a
 * toast that arrived after the fact: told beforehand it is a deal, told
 * afterwards it is a surprise. The second sentence is the "Show in Explore"
 * switch on the design itself.
 *
 * Guests only. The shell publishes nothing for a signed-in visitor, on /try
 * or the dashboard, so for them the sentence would be untrue, and the
 * first-run hint that carries this is drawn by the canvas both share.
 */
export const ExploreNotice = () => {
  const { isGuest } = useGuest()
  if (!isGuest) return null
  return (
    <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
      Finished designs appear on Explore. You can hide yours afterwards.
    </p>
  )
}
