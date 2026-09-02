'use client'

import { useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import Link from 'next/link'

import { LogoMark } from '@/components/logo-mark'
import { Button } from '@/components/ui/button'

import { api } from '../../../convex/_generated/api'
import { EmailGateDialog, type EmailGatePurpose } from './email-gate-dialog'
import { GuestProvider } from './guest-context'
import { useGuestSession } from './use-guest-session'

type Resolver = (ok: boolean) => void
type Pending = { purpose: EmailGatePurpose; resolve: Resolver }

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
 * `freeWeek` is the server's switch, handed down by `src/app/try/page.tsx`.
 * It changes what the exits say — the cap screen below, the out-of-credits
 * sheet and "Keep this canvas" offer an account outside the week and say
 * "accounts open soon" during it — and nothing about what a download costs.
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
  freeWeek = false,
}: {
  children: ReactNode
  admit?: boolean
  freeWeek?: boolean
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

  const [pending, setPending] = useState<Pending | null>(null)
  const ask = useCallback(
    (purpose: EmailGatePurpose) =>
      new Promise<boolean>((resolve) => {
        setPending((current: Pending | null) => {
          current?.resolve(false)
          return { purpose, resolve }
        })
      }),
    [],
  )
  const requireExport = useCallback(() => {
    if (!isGuestRef.current) return Promise.resolve(true)
    // The toll is one address, for ever. Paid already, every later export
    // goes straight through — which is the whole difference between a gate
    // and a nag.
    if (emailGivenRef.current) return Promise.resolve(true)
    return ask('export')
  }, [ask])
  // The same address for a different reason. A guest who has given one is
  // on the list already, so there is nothing to ask and the answer is yes.
  const requestNotice = useCallback(() => {
    if (!isGuestRef.current || emailGivenRef.current) return Promise.resolve(true)
    return ask('notify')
  }, [ask])
  const settle = (ok: boolean) => {
    pending?.resolve(ok)
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
          opens there. To show it on another screen, share it from the canvas. A shared link
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
   * is wrong the moment someone tunes it.
   *
   * An account is offered, because it is the answer: the cap counts guest
   * sessions, and an account is not one. It was not offered before, when
   * `src/app/auth/layout.tsx` sent every /auth screen back to /try during the
   * week and the link would have walked a refused visitor into a circle.
   * Sign-in is open in both states now, and sign-up only outside the week —
   * so during it the primary goes to Explore, and the body says accounts open
   * soon rather than pointing at a form that redirects here.
   *
   * What it says either way is the one thing that is still true: a shared
   * design opens anyway. `/s/<token>` is bypassed by the middleware and
   * `getSharedDesign` is the only unauthenticated function in convex/shares.ts,
   * so it needs no session and the cap cannot touch it. Without that line the
   * screen reads as "Mason is shut", and somebody who followed a friend's link
   * to look at a design believes they have been locked out of something that
   * would in fact have opened.
   */
  if (refusal === 'network-cap') {
    const shared =
      "Guest sessions are shared by everyone on this network, most likely an office or a campus, and today's are used. The count starts again at midnight UTC, so come back tomorrow"
    const body = freeWeek
      ? `${shared}. Sign in if you already have an account, or come back when accounts open.`
      : `${shared}, or make an account, which is not capped.`
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <LogoMark className="size-8 text-muted-foreground" />
        <p className="text-base font-medium">This network has used its guest sessions for today</p>
        <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          A design someone has shared with you is unaffected: a shared link needs no session, so it
          opens now.
        </p>
        <div className="flex flex-col items-center gap-3">
          {freeWeek ? (
            <Button asChild size="sm" className="rounded-full px-4">
              <Link href="/explore">Browse Explore</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="rounded-full px-4">
              <Link href="/auth/sign-up">Create an account</Link>
            </Button>
          )}
          <Link
            href="/auth/sign-in"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (refusal === 'unknown') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <LogoMark className="size-8 text-muted-foreground" />
        <p className="text-base font-medium">Mason is busy right now</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong opening a guest session. Nothing you do here needs an account, so a
          refresh in a moment is usually all it takes.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button size="sm" className="rounded-full px-4" onClick={() => window.location.reload()}>
            Try again
          </Button>
          {/* Somewhere to go that needs no session, so the screen is not a
              dead end while the moment passes. */}
          <Link
            href="/explore"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Browse Explore meanwhile
          </Link>
        </div>
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
    <GuestProvider
      isGuest={isGuest}
      requireExport={requireExport}
      freeWeek={freeWeek}
      requestNotice={requestNotice}
    >
      {children}
      <EmailGateDialog
        open={pending !== null}
        purpose={pending?.purpose ?? 'export'}
        onDone={settle}
      />
    </GuestProvider>
  )
}
