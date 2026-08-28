'use client'

import { useMutation, useQuery } from 'convex/react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Switch } from '@/components/ui/switch'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useGuest } from './guest-context'

/**
 * The "Show in Explore" toggle on a generated design's action bar.
 *
 * Only /try designs are published, so the switch only exists there (or for
 * a guest wherever they are); the dashboard never runs the visibility
 * query. A design the gallery has no row for — generated before the switch
 * shipped, or whose publish failed — is published by switching it on, so
 * the toggle never looks broken on an older design.
 */
export const ExploreSwitch = ({ designId, ready }: { designId: string; ready: boolean }) => {
  const pathname = usePathname()
  const { isGuest } = useGuest()
  const show = ready && (isGuest || (pathname?.startsWith('/try') ?? false))
  const visibility = useQuery(api.explore.visibilityFor, show ? { designIds: [designId] } : 'skip')
  const setVisible = useMutation(api.explore.setVisible)
  const publish = useMutation(api.explore.publish)
  const [pending, setPending] = useState(false)

  if (!show) return null

  const published = visibility?.[designId]

  const toggle = async (next: boolean) => {
    setPending(true)
    try {
      if (published === undefined) {
        if (!next) return
        const projectId = new URLSearchParams(window.location.search).get('project')
        if (!projectId) throw new Error('Open the design from its canvas to publish it')
        await publish({ projectId: projectId as Id<'projects'>, designId, visible: true })
        toast.success('Published to Explore')
      } else {
        await setVisible({ designId, visible: next })
        toast.success(next ? 'Shown in Explore' : 'Hidden from Explore')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update Explore')
    } finally {
      setPending(false)
    }
  }

  return (
    <label
      onPointerDown={(event) => event.stopPropagation()}
      className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground"
      title="Whether this design appears in the public Explore gallery"
    >
      <Switch
        size="sm"
        checked={published === true}
        disabled={visibility === undefined || pending}
        onCheckedChange={(value) => void toggle(value)}
        aria-label="Show in Explore"
      />
      Show in Explore
    </label>
  )
}
