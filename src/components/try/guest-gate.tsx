'use client'

import { useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { LogoMark } from '@/components/logo-mark'
import { Button } from '@/components/ui/button'

import { api } from '../../../convex/_generated/api'
import { GuestProvider } from './guest-context'
import { KeepYourWorkDialog } from './keep-your-work-dialog'
import { useGuestSession } from './use-guest-session'

type Resolver = (ok: boolean) => void

/**
 * Everything under /try sits inside this: it signs a fresh visitor in as a
 * guest, and it is the GuestProvider whose `requireAccount` opens the
 * keep-your-work dialog. The editor and preview pages mount it on their own
 * because they are separate routes, not children of the canvas page.
 */
export const TryGuestGate = ({ children }: { children: ReactNode }) => {
  const { ready, failed } = useGuestSession()
  const me = useQuery(api.guest.me, ready ? {} : 'skip')
  const isGuest = me?.isGuest ?? false

  // Read through a ref so requireAccount keeps one identity for the life of
  // the page; a new function per render would re-run every consumer effect.
  const isGuestRef = useRef(isGuest)
  isGuestRef.current = isGuest

  // Converting a guest to a password account drops isAuthenticated for a
  // beat while the client re-handshakes. Unmounting the canvas then would
  // lose the selection and close the very dialog doing the converting, so
  // once the gate has opened it stays open.
  const [everReady, setEverReady] = useState(false)
  useEffect(() => {
    if (ready) setEverReady(true)
  }, [ready])

  const [pending, setPending] = useState<Resolver | null>(null)
  const requireAccount = useCallback(() => {
    if (!isGuestRef.current) return Promise.resolve(true)
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
    <GuestProvider isGuest={isGuest} requireAccount={requireAccount}>
      {children}
      <KeepYourWorkDialog open={pending !== null} onDone={settle} />
    </GuestProvider>
  )
}
