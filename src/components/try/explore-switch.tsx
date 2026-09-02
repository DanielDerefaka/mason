'use client'

import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Switch } from '@/components/ui/switch'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

/**
 * The "Show in Explore" toggle on a generated design's action bar.
 *
 * On every finished design, wherever it is. It used to exist only on /try, or
 * for a guest, on the reasoning that only /try designs are published, which
 * conflated where designs are published *for* someone with where they may be
 * published at all. `explore.publish` asks only that the caller own the
 * project, so an account on its dashboard was allowed to put a design in the
 * gallery and could not reach the switch that does it. The switch being
 * present publishes nothing: an account's design goes to Explore only when it
 * is turned on, and a guest's is published by `shell.tsx` on its own.
 *
 * A design the gallery has no row for, generated before the switch shipped,
 * whose publish failed, or an account's that was never offered, is published
 * by switching it on, so the toggle never looks broken on an older design.
 * The publish reads `?project=`, which the dashboard canvas carries as /try
 * does.
 */
export const ExploreSwitch = ({ designId, ready }: { designId: string; ready: boolean }) => {
  const visibility = useQuery(api.explore.visibilityFor, ready ? { designIds: [designId] } : 'skip')
  const setVisible = useMutation(api.explore.setVisible)
  const publish = useMutation(api.explore.publish)
  const [pending, setPending] = useState(false)

  if (!ready) return null

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
