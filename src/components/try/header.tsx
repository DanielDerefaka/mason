'use client'

import { useQuery } from 'convex/react'
import { Compass, KeyRound, LayoutDashboard, Plus } from 'lucide-react'
import Link from 'next/link'

import { LogoMark } from '@/components/logo-mark'
import { Button } from '@/components/ui/button'
import { useAppDispatch } from '@/redux/hooks'
import { setFrameDialogOpen } from '@/redux/slice/shapes'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { PoolBanner } from './pool-banner'
import { ShareOnXButton } from './share-on-x-button'
import { SketchMenu } from './sketch-menu'
import { asGuest, isAccount, type GuestMe } from './types'
import type { ShareOnX } from './use-share-on-x'

type Props = {
  me: GuestMe | null | undefined
  keyStored: boolean
  onAddKey: () => void
  share: ShareOnX
  projectId: Id<'projects'> | null
  onOpenSketch: (id: Id<'projects'>) => void
  onNewSketch: () => void
}

const plural = (n: number) => `${n} credit${n === 1 ? '' : 's'}`

/**
 * A guest's pill says what they can spend right now — the pool turn and any
 * bonus are different pots, so they are named apart rather than summed. A
 * real user just sees their balance, the way the dashboard shows it.
 */
const CreditsPill = ({ me }: { me: GuestMe | null | undefined }) => {
  const guest = asGuest(me)
  const balance = useQuery(api.credits.getBalance, me && !guest ? {} : 'skip')

  let label: string
  if (guest) {
    const parts: string[] = []
    if (guest.poolAvailable) parts.push('1 pool')
    if (guest.bonus > 0 || parts.length === 0) parts.push(plural(guest.bonus))
    label = parts.join(' + ')
  } else {
    label = balance == null ? '—' : plural(balance)
  }

  return (
    <span
      className="rounded-full border border-white/10 px-2.5 py-1 text-xs tabular-nums text-muted-foreground"
      title={guest ? 'Your free pool turn today, plus any credits earned by sharing' : 'Your credit balance'}
    >
      {label}
    </span>
  )
}

export const TryHeader = ({
  me,
  keyStored,
  onAddKey,
  share,
  projectId,
  onOpenSketch,
  onNewSketch,
}: Props) => {
  const dispatch = useAppDispatch()
  const isRealUser = isAccount(me)

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/[0.08] bg-background px-4 py-2.5">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold">
        <LogoMark className="size-5" />
        Mason
      </Link>

      <div className="order-last w-full sm:order-none sm:w-auto sm:min-w-[16rem] sm:flex-1 sm:max-w-md">
        <PoolBanner me={me} />
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <CreditsPill me={me} />
        <SketchMenu projectId={projectId} onOpen={onOpenSketch} onNew={onNewSketch} />
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full"
          onClick={() => dispatch(setFrameDialogOpen(true))}
        >
          <Plus className="size-3.5" />
          New frame
        </Button>
        <Button asChild size="sm" variant="ghost" className="rounded-full">
          <Link href="/explore">
            <Compass className="size-3.5" />
            Explore
          </Link>
        </Button>
        <ShareOnXButton share={share} />
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onAddKey}>
          <KeyRound className="size-3.5" />
          {keyStored ? 'Your key' : 'Add your key'}
        </Button>
        {isRealUser && (
          <Button asChild size="sm" variant="ghost" className="rounded-full">
            <Link href="/dashboard">
              <LayoutDashboard className="size-3.5" />
              Dashboard
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}
