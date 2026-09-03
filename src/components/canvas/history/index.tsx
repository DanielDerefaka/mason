'use client'

import { useMutation, useQuery } from 'convex/react'
import { format, formatDistanceToNow } from 'date-fns'
import { History, Loader2, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import type { VersionOrigin } from '@/lib/canvas-history'
import { useAppDispatch } from '@/redux/hooks'
import { readSketches, restoreShapes, setViewport } from '@/redux/slice/shapes'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

/**
 * Version history.
 *
 * Undo lives in Redux and dies with the tab — fine for the last few moves,
 * useless for "put back what I had this morning". This is the durable answer:
 * the canvas as it was, copied about once a minute as somebody works, plus
 * the versions they chose to name before a big change.
 *
 * It used to hold only the named ones, which for most projects was nothing,
 * and restoring reloaded the page: the viewport went, and so did the undo
 * stack, so a restore that turned out to be the wrong one was final. Now the
 * server hands the version back and the store takes it as one undoable
 * step, with the pan and zoom it was saved with.
 *
 * A restore snapshots what it is about to replace, so it is itself undoable
 * from here too.
 */
export const VersionHistory = () => {
  const dispatch = useAppDispatch()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') as Id<'projects'> | null

  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)

  const versions = useQuery(
    api.versions.listVersions,
    projectId && open ? { projectId } : 'skip',
  )
  const saveVersion = useMutation(api.versions.saveVersion)
  const restoreVersion = useMutation(api.versions.restoreVersion)
  const deleteVersion = useMutation(api.versions.deleteVersion)

  if (!projectId) return null

  const save = async () => {
    setBusy(true)
    try {
      await saveVersion({ projectId, label: label.trim() || 'Snapshot' })
      setLabel('')
      toast.success('Version saved')
    } catch {
      toast.error('Could not save that version')
    } finally {
      setBusy(false)
    }
  }

  const restore = async (versionId: Id<'versions'>, name: string) => {
    setBusy(true)
    try {
      const { data } = await restoreVersion({ versionId })
      const { shapes, viewport } = readSketches(data)
      dispatch(restoreShapes(shapes))
      if (viewport) dispatch(setViewport(viewport))
      setOpen(false)
      toast.success(`Restored "${name}"`, {
        description: 'Undo puts it back if that was not the one you meant.',
      })
    } catch {
      toast.error('Could not restore that version')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Version history"
        title="Version history"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground grid size-9 place-items-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.1]"
      >
        <History className="size-[18px]" />
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div className="absolute top-full right-0 z-50 mt-2 w-[320px] overflow-hidden rounded-xl border border-white/10 bg-[#141416] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-medium">
            <History className="size-3.5" />
            Version history
          </span>
          <button
            type="button"
            aria-label="Close version history"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </header>

        <div className="flex gap-2 border-b border-white/10 p-3">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void save()
            }}
            placeholder="Name this version…"
            maxLength={60}
            className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-xs outline-none placeholder:text-white/30 focus:border-white/25"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save
          </button>
        </div>

        <div className="max-h-[320px] overflow-y-auto">
          {versions === undefined ? (
            <p className="text-muted-foreground p-4 text-xs">Loading…</p>
          ) : versions.length === 0 ? (
            /* Says what will be kept rather than that nothing has been: this
               is what somebody sees the first time they come looking for a
               way back. */
            <p className="text-muted-foreground p-4 text-xs leading-relaxed">
              Nothing yet. Mason keeps a copy of the canvas for you as you work,
              about once a minute, and you can name one here before a big
              change. Both stay after the tab closes. Undo does not.
            </p>
          ) : (
            versions.map((version) => {
              // An automatic copy has nothing to be called but its time; a
              // named one is called what the person called it.
              const named = (version.origin as VersionOrigin) !== 'auto'
              const when = new Date(version.createdAt)
              const ago = formatDistanceToNow(when, { addSuffix: true })
              const name = named ? version.label : format(when, 'd MMM, HH:mm')
              return (
                <div
                  key={version._id}
                  className="group flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">{named ? version.label : ago}</p>
                    <p className="text-muted-foreground truncate text-[10px]">
                      {named ? ago : name}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Restore ${name}`}
                    title="Restore"
                    disabled={busy}
                    onClick={() => void restore(version._id, name)}
                    className="text-muted-foreground hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-white/[0.08] disabled:opacity-30"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${name}`}
                    title="Delete"
                    onClick={() => void deleteVersion({ versionId: version._id })}
                    className="grid size-7 shrink-0 place-items-center rounded-md text-red-400 transition-colors hover:bg-red-500/15"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

export default VersionHistory
