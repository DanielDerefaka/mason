'use client'

import { useMutation, useQuery } from 'convex/react'
import { formatDistanceToNow } from 'date-fns'
import { ArchiveRestore, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

/**
 * The archive.
 *
 * Deleting a project puts it here rather than destroying it, because a project
 * holds designs somebody spent credits generating. Everything here can go back,
 * and the one action that cannot be undone asks first and says exactly what it
 * will take with it.
 */
export const ProjectArchive = () => {
  const archived = useQuery(api.project.listArchivedProjects)
  const restore = useMutation(api.project.restoreProjects)
  const destroy = useMutation(api.project.deleteProjectsForever)

  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const ids = () => [...chosen] as Id<'projects'>[]

  const run = async (action: 'restore' | 'destroy') => {
    if (chosen.size === 0) return
    setBusy(true)
    try {
      if (action === 'restore') {
        await restore({ projectIds: ids() })
        toast.success(chosen.size === 1 ? 'Project restored' : `${chosen.size} projects restored`)
      } else {
        await destroy({ projectIds: ids() })
        toast.success(chosen.size === 1 ? 'Project deleted' : `${chosen.size} projects deleted`)
      }
      setChosen(new Set())
      setConfirming(false)
    } catch {
      toast.error('That did not work. Nothing was changed.')
    } finally {
      setBusy(false)
    }
  }

  if (archived === undefined) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  }

  if (archived.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-sm">
        Nothing archived. Projects you delete land here, and can be restored from here.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground mr-auto text-sm">
          {chosen.size > 0
            ? `${chosen.size} selected`
            : `${archived.length} archived project${archived.length === 1 ? '' : 's'}`}
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={chosen.size === 0 || busy}
          onClick={() => void run('restore')}
          className="gap-1.5 rounded-full text-xs"
        >
          <ArchiveRestore className="size-3.5" />
          Restore
        </Button>

        {/* Two presses rather than a dialog: the second button says what it
            does, and the first cannot be hit by accident. */}
        <Button
          type="button"
          variant={confirming ? 'destructive' : 'outline'}
          size="sm"
          disabled={chosen.size === 0 || busy}
          onClick={() => (confirming ? void run('destroy') : setConfirming(true))}
          onBlur={() => setConfirming(false)}
          className="gap-1.5 rounded-full text-xs"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          {confirming ? 'Delete forever, including uploads' : 'Delete forever'}
        </Button>
      </div>

      <div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.08]">
        {archived.map((project) => {
          const picked = chosen.has(project._id)
          return (
            <label
              key={project._id}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors',
                picked ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
              )}
            >
              <input
                type="checkbox"
                checked={picked}
                onChange={() => toggle(project._id)}
                className="size-4 accent-white"
              />
              <span className="min-w-0 flex-1 truncate text-sm">{project.name}</span>
              <span className="text-muted-foreground shrink-0 text-xs">
                archived{' '}
                {project.archivedAt
                  ? formatDistanceToNow(project.archivedAt, { addSuffix: true })
                  : ''}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
