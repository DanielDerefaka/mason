'use client'

import { KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import { formatRoughCountdown } from './countdown'
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
 * Rises when a generation is refused for want of credits. It offers the two
 * ways forward that work right now and says when the free one returns, so
 * nobody has to guess whether "tomorrow" means their midnight or ours.
 */
export const OutOfCreditsSheet = ({ open, onOpenChange, share, onAddKey, resetsAt }: Props) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="dark border-white/10 bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-4">
        <SheetHeader className="px-0">
          <SheetTitle>Out of free generations</SheetTitle>
          <SheetDescription>
            The community pool and your credits are spent for today. Two ways to keep going
            now, or the pool refills on its own.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          {share.earnsBonus && (
            <Button
              className="rounded-full"
              disabled={Boolean(share.disabledReason) || share.busy}
              onClick={() => {
                onOpenChange(false)
                void share.share()
              }}
            >
              Share on X (+2)
            </Button>
          )}
          <Button
            variant={share.earnsBonus ? 'outline' : 'default'}
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
        <p className="text-xs text-muted-foreground">
          Comes back at 00:00 UTC (in {formatRoughCountdown(resetsAt - Date.now())})
        </p>
      </div>
    </SheetContent>
  </Sheet>
)
