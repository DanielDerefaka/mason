'use client'

import { useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

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
 */
export const TryGuestGate = ({ children }: { children: ReactNode }) => {
  const { ready, failed } = useGuestSession()
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

  if (failed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <LogoMark className="size-8 text-muted-foreground" />
        <p className="text-base font-medium">Mason is busy — try again in a minute</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          New guest sessions are capped so the community pool stays fair. Nothing you do here
          needs an account, so a refresh in a moment is all it takes.
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
