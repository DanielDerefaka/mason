'use client'

import { useMutation } from 'convex/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { DESIGN_SCOPE } from '@/lib/sanitise'
import { captureDesignPng } from '@/lib/try/capture'
import { latestFinishedDesign } from '@/lib/try/latest-design'
import { useAppSelector } from '@/redux/hooks'
import { shapesAdapter } from '@/redux/slice/shapes'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { asGuest, type GuestMe } from './types'
import { uploadBlob } from './upload'

const SHARE_TEXT = 'I sketched this and Mason turned it into a real page 👇'

const selectors = shapesAdapter.getSelectors()

export type ShareOnX = {
  share: () => Promise<void>
  busy: boolean
  /** Why the button is off, or null when it is live. */
  disabledReason: string | null
  /** True while a guest can still earn the +2 for sharing. */
  earnsBonus: boolean
}

/**
 * One share flow for the header button and the out-of-credits sheet.
 *
 * Order matters: the X composer is opened straight after the share row
 * exists, because a pop-up is only allowed inside the few seconds of a
 * click, and capturing the design PNG can take longer than that on a big
 * page. The card is attached afterwards — X only fetches it when the post
 * is actually sent, which is later still.
 */
export const useShareOnX = ({
  projectId,
  me,
}: {
  projectId: Id<'projects'> | null
  me: GuestMe | null | undefined
}): ShareOnX => {
  // `state.shapes` is the slice, and the entity table sits one level inside
  // it at `.entities` — which is itself `{ ids, entities }`. Reading
  // `state.shapes.ids` therefore found nothing at all and the `.length` below
  // threw during render, so /try hit the error boundary on mount, every time,
  // for everyone. Nothing server-side saw it: the page renders its Suspense
  // fallback and only crashes once the shell hydrates.
  //
  // The adapter state is what gets selected, not the array: `selectAll`
  // builds a new array on every call, and a selector that never returns the
  // same reference twice re-renders this hook on every action on the canvas.
  const entities = useAppSelector((state) => state.shapes.entities)
  const createShare = useMutation(api.shares.createShare)
  const setPreview = useMutation(api.shares.setPreview)
  const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
  const claimShare = useMutation(api.guest.claimShare)
  const [busy, setBusy] = useState(false)

  const latest = useMemo(() => latestFinishedDesign(selectors.selectAll(entities)), [entities])

  const guest = asGuest(me)
  const earnsBonus = guest?.canClaimShare ?? false
  const disabledReason = !projectId
    ? 'Your canvas is still opening'
    : !latest
      ? 'Generate a design first, then share it'
      : null

  const attachPreview = async (token: string, designId: string) => {
    const node = document.querySelector<HTMLElement>(
      `[data-design-id="${CSS.escape(designId)}"] .${DESIGN_SCOPE}`,
    )
    if (!node) return
    // Null on Safari, which has no canvas-from-foreignObject: the share works,
    // the post just carries no picture.
    const png = await captureDesignPng(node)
    if (!png) return
    const storageId = await uploadBlob(() => generateUploadUrl({}), png)
    if (!storageId) return
    try {
      await setPreview({ token, storageId: storageId as Id<'_storage'> })
    } catch {
      // Decoration; the link already works.
    }
  }

  const share = async () => {
    if (busy || disabledReason || !latest || !projectId) return
    setBusy(true)
    try {
      const token = await createShare({ projectId, designId: latest.id })
      const url = `${window.location.origin}/s/${token}`
      const intent = `https://x.com/intent/post?text=${encodeURIComponent(SHARE_TEXT)}&url=${url}`
      const popup = window.open(intent, '_blank')
      if (popup) {
        popup.opener = null
      } else {
        try {
          await navigator.clipboard.writeText(url)
        } catch {
          // Clipboard refused too; the toast still names the link.
        }
        toast('Pop-up blocked — the share link is on your clipboard', { description: url })
      }
      void attachPreview(token, latest.id)
      if (earnsBonus) {
        await claimShare({})
        toast.success('+2 credits added')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not share that design')
    } finally {
      setBusy(false)
    }
  }

  return { share, busy, disabledReason, earnsBonus }
}
