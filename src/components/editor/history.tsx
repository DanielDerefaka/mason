'use client'

import { useMutation, useQuery } from 'convex/react'
import { format, formatDistanceToNow } from 'date-fns'
import { History, Loader2, RotateCcw } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { track } from '@/lib/analytics'
import type { Origin } from '@/lib/design-history'
import { cn } from '@/lib/utils'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useDismiss } from './use-dismiss'

/**
 * The design's own history, in the one place somebody looks for it.
 *
 * Beside undo and redo, because that is where a person goes when they have
 * broken something, and the moment undo runs out is the moment this is the
 * answer. Undo is the last few moves in this tab; these are the states the
 * design has actually been in, kept whether or not the tab is still open.
 *
 * The snapshots are taken without being asked. Nothing here saves a version:
 * a control that has to be pressed before a mistake is a control nobody
 * presses, and the person who needs this most is the one who did not know
 * they were about to need it.
 */

/** What the second line of a row says, when the timestamp is not the point. */
const NOTE: Partial<Record<Origin, string>> = {
  original: 'Before your first edit',
  restore: 'Before restoring',
}

export const HistoryButton = ({
  projectId,
  designId,
  currentHtml,
  onRestore,
}: {
  projectId: Id<'projects'> | null
  designId: string
  /** Read at the moment of restoring, so the snapshot kept is what is on screen. */
  currentHtml: () => string
  onRestore: (html: string) => void
}) => {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const popover = useRef<HTMLDivElement>(null)
  useDismiss(open, popover, () => setOpen(false))

  const versions = useQuery(
    api.design_versions.list,
    projectId && open ? { projectId, designId } : 'skip',
  )
  const restore = useMutation(api.design_versions.restore)

  if (!projectId) return null

  const toggle = () => {
    setOpen((value) => {
      if (!value) track('design_history_opened')
      return !value
    })
  }

  const apply = async (versionId: Id<'design_versions'>) => {
    setBusy(true)
    try {
      const { html } = await restore({ versionId, current: currentHtml() })
      onRestore(html)
      track('design_restored')
      setOpen(false)
      toast.success('Restored', {
        description: 'Undo puts it back if that was not the one you meant.',
      })
    } catch {
      toast.error('Could not restore that version')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={popover} className="relative">
      <button
        type="button"
        aria-label="Version history"
        title="Version history"
        onClick={toggle}
        className={cn(
          'grid size-8 place-items-center rounded-md transition-colors',
          open
            ? 'text-foreground bg-white/[0.1]'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]',
        )}
      >
        <History className="size-4" />
      </button>

      {open && (
        <>
          <div className="absolute top-full right-0 z-50 mt-2 w-[300px] overflow-hidden rounded-xl border border-white/10 bg-[#141416] shadow-2xl">
            <header className="border-b border-white/10 px-3 py-2.5">
              <p className="text-[11px] font-medium">History</p>
              <p className="text-muted-foreground mt-0.5 text-[10px] leading-relaxed">
                Saved for you as you work, and kept after the tab closes.
              </p>
            </header>

            <div className="max-h-[320px] overflow-y-auto">
              {versions === undefined ? (
                <p className="text-muted-foreground p-3 text-xs">Loading…</p>
              ) : versions.length === 0 ? (
                /* The state a design is in the first time anybody opens this,
                   which is also the state it is in for anyone who came here
                   looking for a way back. Saying what will happen is more use
                   than saying that nothing has. */
                <p className="text-muted-foreground p-3 text-[11px] leading-relaxed">
                  Nothing yet. The first change you make will put a copy of this
                  design here, so you can always get back to how it looks now.
                </p>
              ) : (
                versions.map((version) => (
                  <div
                    key={version._id}
                    className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">
                        {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                      </p>
                      <p className="text-muted-foreground truncate text-[10px]">
                        {NOTE[version.origin as Origin] ??
                          format(new Date(version.createdAt), 'd MMM, HH:mm')}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Restore this version"
                      title="Restore"
                      disabled={busy}
                      onClick={() => void apply(version._id)}
                      className="text-muted-foreground hover:text-foreground grid size-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-white/[0.08] disabled:opacity-30"
                    >
                      {busy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3.5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default HistoryButton
