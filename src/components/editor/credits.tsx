'use client'

import { useQuery } from 'convex/react'
import { useEffect, useState } from 'react'

import { KeyDialog } from '@/components/try/key-dialog'
import { OutOfCreditsSheet } from '@/components/try/out-of-credits-sheet'
import { useShareOnX } from '@/components/try/use-share-on-x'
import { BYOK_CHANGED_EVENT, getByokKey } from '@/lib/try/byok-client'
import { OUT_OF_CREDITS_EVENT } from '@/lib/try/generate-fetch'
import { nextResetAt } from '@/lib/try/pool-day'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

/**
 * What a guest sees when the editor's Ask AI is refused for credits.
 *
 * The canvas shell listens for `mason:out-of-credits` and opens the sheet that
 * offers the two ways on: share for +2, or bring a key. The editor is a
 * different route, and it had no listener, so a 402 there was a toast reading
 * "Out of credits" with nothing to do about it, in the one place a guest most
 * wants to keep going. This mounts the same sheet and the same key dialog
 * under the editor, wired the way the shell wires them, so the refusal reads
 * the same wherever it happens.
 *
 * Only under /try: the dashboard has credits of its own and no guest pool.
 */
export const EditorCredits = ({ projectId }: { projectId: Id<'projects'> | null }) => {
  const me = useQuery(api.guest.me)
  const pool = useQuery(api.pool.status)
  // The sheet's Share on X reads the canvas's Redux table to find a finished
  // design, and the editor never loads one into it, so that button is off in
  // here. The key route works; the share route says why it does not.
  const share = useShareOnX({ projectId, me })

  const [sheetOpen, setSheetOpen] = useState(false)
  const [keyOpen, setKeyOpen] = useState(false)
  const [keyStored, setKeyStored] = useState(false)

  useEffect(() => {
    const sync = () => setKeyStored(Boolean(getByokKey()))
    sync()
    window.addEventListener(BYOK_CHANGED_EVENT, sync)
    return () => window.removeEventListener(BYOK_CHANGED_EVENT, sync)
  }, [])

  useEffect(() => {
    const open = () => setSheetOpen(true)
    window.addEventListener(OUT_OF_CREDITS_EVENT, open)
    return () => window.removeEventListener(OUT_OF_CREDITS_EVENT, open)
  }, [])

  return (
    <>
      <KeyDialog open={keyOpen} onOpenChange={setKeyOpen} stored={keyStored} />
      <OutOfCreditsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        share={share}
        onAddKey={() => setKeyOpen(true)}
        resetsAt={pool?.resetsAt ?? nextResetAt()}
      />
    </>
  )
}
