'use client'

import { KeyRound } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import { formatRoughCountdown } from './countdown'
import { useAccountNotice, useGuest } from './guest-context'
import type { ShareOnX } from './use-share-on-x'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  share: ShareOnX
  onAddKey: () => void
  /** When the pool comes back, from `api.pool.status`. */
  resetsAt: number
}

/**
 * Rises when a generation is refused for want of credits. It offers what
 * works right now, the account that would have, and says when the free one
 * returns, so nobody has to guess whether "tomorrow" means their midnight or
 * ours.
 *
 * The account row is the exit this sheet never had: a guest out of
 * generations was shown two more ways to stay a guest and a countdown, on the
 * one screen where an account is the plain answer. "Ten generations to
 * start" is `STARTING_CREDITS` in convex/credits.ts, held to the word by
 * copy.test.ts; `BILLING_ENFORCED` gates the dashboard, not the starting
 * balance, so the number holds in both of its states. During the free week
 * the form is closed, so the row asks for an address instead.
 *
 * The share row is offered to every guest, off with its reason under it when
 * it cannot be pressed. It used to be rendered only while the bonus was on,
 * so a guest whose share had been claimed, or whose one design had been
 * refunded, saw the row the banner promised them vanish with no word why.
 */
export const OutOfCreditsSheet = ({ open, onOpenChange, share, onAddKey, resetsAt }: Props) => {
  const { isGuest, freeWeek } = useGuest()
  const notify = useAccountNotice()

  // A clock, not a snapshot: the countdown was computed once at render, and
  // a sheet left open for an hour still said the hour it opened with.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const tick = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(tick)
  }, [open])

  const offerShare = isGuest || share.earnsBonus
  const shareOff = share.earnsBonus ? share.disabledReason : share.bonusReason

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="dark border-white/10 bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-4">
          <SheetHeader className="px-0">
            <SheetTitle>Out of free generations</SheetTitle>
            <SheetDescription>
              The community pool and your credits are spent for today. Keep going now, or the
              pool refills on its own.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            {offerShare && (
              <Button
                className="rounded-full"
                disabled={Boolean(shareOff) || share.busy}
                onClick={() => {
                  onOpenChange(false)
                  void share.share()
                }}
              >
                Share on X (+2)
              </Button>
            )}
            <Button
              variant={offerShare && !shareOff ? 'outline' : 'default'}
              className="rounded-full"
              onClick={() => {
                onOpenChange(false)
                onAddKey()
              }}
            >
              <KeyRound className="size-4" />
              Add your key
            </Button>
          </div>
          {offerShare && shareOff && (
            <p className="text-xs text-muted-foreground">{shareOff}</p>
          )}
          {isGuest && (
            <p className="text-sm text-muted-foreground">
              {freeWeek ? (
                <>
                  Accounts open soon.{' '}
                  <button
                    type="button"
                    className="underline underline-offset-4 hover:text-foreground"
                    onClick={() => {
                      onOpenChange(false)
                      notify()
                    }}
                  >
                    Leave an email and we will tell you.
                  </button>
                </>
              ) : (
                <Link href="/auth/sign-up" className="underline underline-offset-4 hover:text-foreground">
                  Make an account: ten generations to start, no card.
                </Link>
              )}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Comes back at 00:00 UTC (in {formatRoughCountdown(resetsAt - now)})
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
