'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { stripTruncationMarker, wasTruncated } from '@/lib/truncation'
import { generateFetch, noteGenerateRefusal } from '@/lib/try/generate-fetch'

import { useAppDispatch } from '@/redux/hooks'
import { setGeneratedHtml } from '@/redux/slice/shapes'

/** Repainting on every chunk pegs a CPU; the tail lands in a few dozen updates. */
const UPDATE_INTERVAL = 200

/**
 * Finishes a design the model stopped writing.
 *
 * A generation that hits the output ceiling leaves a half-written element and
 * no footer. Until now the only way forward was to generate the whole thing
 * again — another credit, and a fresh roll of the dice on a page that was
 * mostly right. This asks only for the remainder and appends it.
 *
 * The existing markup is never re-rendered from scratch: the continuation is
 * concatenated onto what is already on the canvas, so the part the user can
 * already see does not flicker or change under them.
 *
 * It can itself be cut off — a design far past the ceiling may need two passes
 * — so the result is checked the same way, and offers to continue again.
 */
export const useContinueDesign = () => {
  const dispatch = useAppDispatch()
  const [runningFor, setRunningFor] = useState<string | null>(null)

  const continueDesign = useCallback(
    async (id: string, html: string) => {
      const projectId = new URLSearchParams(window.location.search).get('project')
      if (!projectId) {
        toast.error('Open a project first')
        return
      }
      if (runningFor) return
      if (!html.trim()) {
        toast.error('There is nothing to continue')
        return
      }

      setRunningFor(id)
      // Whatever was already written stays exactly as it is; the model only
      // ever adds to the end.
      const existing = stripTruncationMarker(html)
      // Outlives the try: what the continuation managed to add before it
      // stopped is kept on a failure too.
      let tail = ''

      try {
        const response = await generateFetch('/api/generate/continue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, html: existing }),
        })

        if (!response.ok || !response.body) {
          const refusal = noteGenerateRefusal(response)
          const message = await response
            .json()
            .then((body: { message?: string }) => body.message)
            .catch(() => null)
          throw Object.assign(
            new Error(refusal.message ?? message ?? 'Failed to continue the design'),
            { description: refusal.description, sheetOpened: refusal.sheetOpened },
          )
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let lastUpdate = 0

        dispatch(setGeneratedHtml({ id, html: existing, streaming: true }))

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break

          tail += decoder.decode(value, { stream: true })
          const now = Date.now()
          if (now - lastUpdate >= UPDATE_INTERVAL) {
            lastUpdate = now
            dispatch(setGeneratedHtml({ id, html: existing + tail, streaming: true }))
          }
        }

        tail += decoder.decode()
        const cutAgain = wasTruncated(tail)
        const combined = existing + stripTruncationMarker(tail)
        dispatch(setGeneratedHtml({ id, html: combined, streaming: false }))

        if (cutAgain) {
          toast.warning('Still not finished', {
            description: 'It ran past the limit again. Continue once more to add the rest.',
            action: { label: 'Continue', onClick: () => void continueDesign(id, combined) },
          })
        } else {
          toast.success('Design finished')
        }
      } catch (error) {
        // The partial design stays on the canvas, with whatever the
        // continuation added before it stopped — it is most of a page, and
        // throwing it away because the continuation failed is the worse of
        // the two outcomes. The offer stays with it: the toast that first
        // offered Continue was dismissed by the click, so a failure with no
        // way back in left a cut page with no way to finish it but paying for
        // a whole new one.
        const kept = existing + stripTruncationMarker(tail)
        dispatch(setGeneratedHtml({ id, html: kept, streaming: false }))
        const refused = error as Error & { description?: string; sheetOpened?: boolean }
        const again = { label: 'Try again', onClick: () => void continueDesign(id, kept) }
        if (refused.sheetOpened) {
          // The sheet says why. This holds the offer for after it closes, so
          // a key added or a share made can pick the page up where it stopped.
          toast('The rest of the page is still on offer', {
            description: 'Press Try again once you have a credit.',
            duration: 60000,
            action: again,
          })
          return
        }
        toast.error(error instanceof Error ? error.message : 'Failed to continue the design', {
          description: refused.description ?? 'The design is on the canvas as far as it got.',
          duration: 30000,
          action: again,
        })
      } finally {
        setRunningFor(null)
      }
    },
    [dispatch, runningFor],
  )

  return { continueDesign, continueRunningFor: runningFor }
}
