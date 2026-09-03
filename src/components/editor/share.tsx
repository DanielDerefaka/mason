'use client'

import { useMutation, useQuery } from 'convex/react'
import { Check, Copy, Link2, Loader2, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { useGuest } from '@/components/try/guest-context'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useDismiss } from './use-dismiss'

/**
 * The share control.
 *
 * A link is created on demand rather than existing for every design, so
 * nothing is reachable until someone decides it should be. Sharing the same
 * design twice returns the same URL — minting a second would leave the first
 * live and forgotten.
 */
export const ShareButton = ({
  projectId,
  designId,
}: {
  projectId: Id<'projects'> | null
  designId: string
}) => {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const popover = useRef<HTMLDivElement>(null)
  useDismiss(open, popover, () => setOpen(false))
  const { isGuest } = useGuest()

  const token = useQuery(
    api.shares.shareFor,
    projectId && open ? { projectId, designId } : 'skip',
  )
  const createShare = useMutation(api.shares.createShare)
  const revokeShare = useMutation(api.shares.revokeShare)

  if (!projectId) return null

  const url = token ? `${window.location.origin}/s/${token}` : null

  const create = async () => {
    setBusy(true)
    try {
      const next = await createShare({ projectId, designId })
      track('share_created', { via: 'editor' })
      await navigator.clipboard
        .writeText(`${window.location.origin}/s/${next}`)
        .catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Link copied')
    } catch {
      toast.error('Could not create a link')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!url) return
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const revoke = async () => {
    if (!token) return
    setBusy(true)
    try {
      await revokeShare({ token })
      toast.success('Link revoked')
    } catch {
      toast.error('Could not revoke that link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={popover} className="relative">
      <button
        type="button"
        aria-label="Share"
        title="Share a public link"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] transition-colors',
          open
            ? 'bg-white/[0.1] text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]',
        )}
      >
        <Link2 className="size-3.5" />
        Share
      </button>

      {open && (
        <>
          <div className="absolute top-full right-0 z-50 mt-2 w-[300px] rounded-xl border border-white/10 bg-[#141416] p-3 shadow-2xl">
            {token === undefined ? (
              <p className="text-muted-foreground py-2 text-xs">Checking…</p>
            ) : token === null ? (
              <>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Anyone with the link can view this design. They will not need an
                  account, and they cannot edit it or see the rest of your project.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void create()}
                  className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-white text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
                  Create a link
                </button>
              </>
            ) : (
              <>
                <p className="text-[11px] text-white/70">Anyone with this link can view it.</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    readOnly
                    value={url ?? ''}
                    onFocus={(event) => event.currentTarget.select()}
                    className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2 font-mono text-[10px] outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Copy link"
                    title="Copy"
                    onClick={() => void copy()}
                    className="text-muted-foreground hover:text-foreground grid size-9 shrink-0 place-items-center rounded-md transition-colors hover:bg-white/[0.08]"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Revoke link"
                    title="Revoke"
                    disabled={busy}
                    onClick={() => void revoke()}
                    className="grid size-9 shrink-0 place-items-center rounded-md text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </>
            )}

            {/* A guest's design is kept for a fortnight and then gone, and a
                link to it goes with it. The dialog used to promise "anyone
                with this link can view it" with no end on the promise, to
                the one kind of account whose work has one. */}
            {isGuest && token !== undefined && (
              <p className="text-muted-foreground mt-3 border-t border-white/10 pt-3 text-[11px] leading-relaxed">
                This design was made without an account, so it is kept for fourteen days.
                The link stops working when it goes.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
