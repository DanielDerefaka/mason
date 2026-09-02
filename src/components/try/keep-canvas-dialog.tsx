'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useAccountNotice, useGuest } from './guest-context'

/**
 * The way out of a guest session, offered from the canvas.
 *
 * A guest's work lives in one browser for fourteen days (`STALE_AFTER_MS` in
 * convex/guest.ts, and copy.test.ts holds the word here to it) and nothing on
 * /try used to say so, or say what to do about it: the header linked to the
 * marketing site and to Explore, and the only account on the page was the
 * dialog that demanded one before a download, since removed. This is the
 * honest version — what is kept, for how long, and what an account changes —
 * behind a button that appears only once there is a design worth keeping.
 *
 * "Create an account" is a plain link to /auth/sign-up because
 * `convex/auth.ts` converts the anonymous user in place when a password
 * account is made in the same browser: the projects, their versions and their
 * share links keep their owner, so nothing has to be claimed or moved. The
 * claim subsystem in convex/guest.ts exists for the other case, an address
 * that already has an account, and nothing calls it yet.
 *
 * During the free week the form is closed, so the primary asks for an
 * address instead and the body says accounts open soon.
 */
export const KeepCanvasDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const { freeWeek } = useGuest()
  const notify = useAccountNotice()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark max-w-md border-white/10 bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Keep this canvas</DialogTitle>
          <DialogDescription>
            Sketches made without an account stay in this browser for fourteen days. Make an
            account and this canvas moves across with its history and its share links. It takes
            an email and a password.{freeWeek && ' Accounts open soon.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          {freeWeek ? (
            <Button
              className="rounded-full"
              onClick={() => {
                onOpenChange(false)
                notify()
              }}
            >
              Tell me when
            </Button>
          ) : (
            <Button asChild className="rounded-full">
              <Link href="/auth/sign-up">Create an account</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
