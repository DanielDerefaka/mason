'use client'

import { useMutation, useQuery } from 'convex/react'
import { formatDistanceToNow } from 'date-fns'
import { History, Loader2, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

/**
 * Version history.
 *
 * Undo lives in Redux and dies with the tab — fine for the last few moves,
 * useless for "put back what I had this morning". This is the durable answer:
 * named snapshots you take deliberately, and can restore from any session.
 *
 * A restore snapshots what it is about to replace, so it is itself undoable.
 */
export const VersionHistory = () => {
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
      await restoreVersion({ versionId })
      toast.success(`Restored "${name}"`)
      setOpen(false)
      // The canvas hydrates its shapes once on mount, so it has to be
      // remounted to show what was just restored.
      window.location.reload()
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
            <p className="text-muted-foreground p-4 text-xs leading-relaxed">
              No versions yet. Save one before a big change and you can always come
              back to it. Undo only lasts as long as this tab.
            </p>
          ) : (
            versions.map((version) => (
              <div
                key={version._id}
                className="group flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs">{version.label}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Restore ${version.label}`}
                  title="Restore"
                  disabled={busy}
                  onClick={() => void restore(version._id, version.label)}
                  className="text-muted-foreground hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-white/[0.08] disabled:opacity-30"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${version.label}`}
                  title="Delete"
                  onClick={() => void deleteVersion({ versionId: version._id })}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-red-400 transition-colors hover:bg-red-500/15"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

export default VersionHistory
