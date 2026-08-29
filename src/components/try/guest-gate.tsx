'use client'

import { useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import Link from 'next/link'

import { LogoMark } from '@/components/logo-mark'
import { Button } from '@/components/ui/button'

import { api } from '../../../convex/_generated/api'
import { EmailGateDialog } from './email-gate-dialog'
import { GuestProvider } from './guest-context'
import { useGuestSession } from './use-guest-session'

type Resolver = (ok: boolean) => void

/**
 * Everything under /try sits inside this: it signs a fresh visitor in as a
 * guest, and it is the GuestProvider whose `requireExport` asks a guest for
 * an email before their first download. The editor and preview pages mount it
 * on their own because they are separate routes, not children of the canvas
 * page.
 *
 * The toll is an address, never an account, and that does not depend on
 * `FREE_WEEK`. /try's promise is that nothing here needs an account; a
 * "Create account" dialog in front of the export contradicted it every day of
 * the year the flag happened to be off, which is most of them.
 *
 * `admit` is what separates the canvas from the two routes that only display
 * something. /try starts work, so it opens a session; /try/editor and
 * /try/preview open a project named in their own URL, which no new session
 * could own, so they pass `admit={false}` and use whatever session the browser
 * already has. See `use-guest-session.ts` for what minting one there cost.
 */
export const TryGuestGate = ({
  children,
  admit = true,
}: {
  children: ReactNode
  admit?: boolean
}) => {
  const { ready, refusal, sessionless } = useGuestSession({ admit })
  const me = useQuery(api.guest.me, ready ? {} : 'skip')
  const isGuest = me?.isGuest ?? false
  // Asked once, and "once" has to survive a reload — so it is the guest row
  // that remembers, not this tab.
  const emailGiven = me?.emailGiven ?? false

  // Read through a ref so requireExport keeps one identity for the life of
  // the page; a new function per render would re-run every consumer effect.
  const isGuestRef = useRef(isGuest)
  isGuestRef.current = isGuest
  const emailGivenRef = useRef(emailGiven)
  emailGivenRef.current = emailGiven

  // Converting a guest to a password account drops isAuthenticated for a
  // beat while the client re-handshakes. Unmounting the canvas then would
  // lose the selection and close the very dialog doing the converting, so
  // once the gate has opened it stays open.
  const [everReady, setEverReady] = useState(false)
  useEffect(() => {
    if (ready) setEverReady(true)
  }, [ready])

  const [pending, setPending] = useState<Resolver | null>(null)
  const requireExport = useCallback(() => {
    if (!isGuestRef.current) return Promise.resolve(true)
    // The toll is one address, for ever. Paid already, every later export
    // goes straight through — which is the whole difference between a gate
    // and a nag.
    if (emailGivenRef.current) return Promise.resolve(true)
    return new Promise<boolean>((resolve) => {
      setPending((current: Resolver | null) => {
        current?.(false)
        return resolve
      })
    })
  }, [])
  const settle = (ok: boolean) => {
    pending?.(ok)
    setPending(null)
  }

  /**
   * A page whose session lives in another browser.
   *
   * Only /try/editor and /try/preview can land here, and the commonest way is
   * the honest one: somebody opened their own preview link on a second screen.
   * Their design is not missing and nothing has gone wrong — a guest session
   * is held by one browser, so the work is on the machine they drew it on.
   * Said plainly, because the alternative was to sign them in as a brand-new
   * guest and show them an empty canvas, which answered the question wrongly
   * and spent one of the network's daily sessions doing it.
   */
  if (sessionless) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <LogoMark className="size-8 text-muted-foreground" />
        <p className="text-base font-medium">This design is open in another browser</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Work made without an account stays in the browser it was drawn in, so this link only
          opens there. To show it on another screen, share it from the canvas — a shared link
          opens anywhere, with no account and nothing to sign in to.
        </p>
        <Button asChild size="sm" className="rounded-full px-4">
          <Link href="/try">Start a canvas here</Link>
        </Button>
      </div>
    )
  }

  /**
   * The cap is a rule, so it is said as one.
   *
   * It counts a network for a UTC day rather than a person, and one NAT can be
   * an office or a lecture hall — so whoever is reading this has very likely
   * done nothing except arrive tenth. The screen that used to be here said
   * Mason was busy and offered a refresh; both were false, and no refresh can
   * succeed before midnight UTC.
   *
   * No figure is quoted, for the reason `src/lib/marketing-faq.ts` gives:
   * `GUEST_SESSIONS_PER_IP_PER_DAY` is configuration, and a sentence naming it
   * is wrong the moment someone tunes it. No account is offered either —
   * during the free week `src/app/auth/layout.tsx` sends every /auth screen
   * back to /try, so a "make an account" link here would walk a refused
   * visitor into a circle.
   */
  if (refusal === 'network-cap') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <LogoMark className="size-8 text-muted-foreground" />
        <p className="text-base font-medium">This network has used its guest sessions for today</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Guest sessions are counted per network, and this one — an office or a campus, most
          likely — has opened its share for the day. It starts again at midnight UTC, so come back
          tomorrow and the canvas is yours.
        </p>
      </div>
    )
  }

  if (refusal === 'unknown') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <LogoMark className="size-8 text-muted-foreground" />
        <p className="text-base font-medium">Mason is busy — try again in a minute</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong opening a guest session. Nothing you do here needs an account, so a
          refresh in a moment is usually all it takes.
        </p>
        <Button size="sm" className="rounded-full px-4" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!everReady) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <GuestProvider isGuest={isGuest} requireExport={requireExport}>
      {children}
      <EmailGateDialog open={pending !== null} onDone={settle} />
    </GuestProvider>
  )
}
