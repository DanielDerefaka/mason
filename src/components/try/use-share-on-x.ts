'use client'

import { useMutation } from 'convex/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { track } from '@/lib/analytics'
import { DESIGN_SCOPE } from '@/lib/sanitise'
import { captureDesignPng } from '@/lib/try/capture'
import { refusalFrom } from '@/lib/try/guest-refusal'
import { latestFinishedDesign } from '@/lib/try/latest-design'
import { useAppSelector } from '@/redux/hooks'
import { shapesAdapter } from '@/redux/slice/shapes'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { asGuest, type GuestMe } from './types'
import { uploadBlob } from './upload'

// The public name, because this is the one sentence of ours that leaves the
// site: the post body is read by people who have never seen the product, and
// "Mason" on its own is a bricklayer and a jar.
const SHARE_TEXT = 'I sketched this and SketchMason turned it into a real page 👇'
/** Said on the disabled button, and again if the server is the one to refuse. */
const NEEDS_DESIGN = 'Generate a design first, then share it'

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
  const disabledReason = !projectId ? 'Your canvas is still opening' : !latest ? NEEDS_DESIGN : null

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
      track('share_created', { via: 'x' })
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
        toast('Pop-up blocked, so the share link is on your clipboard', { description: url })
      }
      void attachPreview(token, latest.id)
      if (earnsBonus) {
        await claimShare({})
        toast.success('+2 credits added')
      }
    } catch (error) {
      // `claimShare` refuses with a code when the guest has not generated
      // yet; the button is already off in that state, so this is the server
      // disagreeing with the canvas. Anything else is masked by Convex in
      // production, so its message is never the one to show.
      toast.error(
        refusalFrom(error) === 'share-before-design' ? NEEDS_DESIGN : 'Could not share that design',
      )
    } finally {
      setBusy(false)
    }
  }

  return { share, busy, disabledReason, earnsBonus }
}
