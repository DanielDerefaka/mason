'use client'

import { nanoid } from '@reduxjs/toolkit'
import { useState } from 'react'
import { toast } from 'sonner'

import { stripOutcomeMarkers, wasEmpty, wasTruncated } from '@/lib/truncation'
import { useContinueDesign } from '@/hooks/use-continue-design'

import { useAppDispatch } from '@/redux/hooks'
import { addGeneratedUI, removeShape, setGeneratedHtml, type Shape } from '@/redux/slice/shapes'

/** Gap between a design and the mobile version placed beside it. */
const GUTTER = 80

/** iPhone 16 point width — what the mobile prompt designs against. */
const PHONE_WIDTH = 390

/** Repainting on every chunk pegs a CPU; a design lands in ~40 updates instead. */
const UPDATE_INTERVAL = 200

/**
 * Builds the mobile version of a finished design.
 *
 * A new shape beside the original rather than a replacement, because the two
 * are both wanted: a desktop and a mobile artboard, the way a designer keeps
 * them. Each can then be edited independently.
 *
 * The model restructures rather than narrows — a nav collapses, columns stack,
 * the type scale drops. Squeezing the desktop layout into 390px is what the
 * browser already does badly, and is the thing this exists to avoid.
 */
export const useMobileVersion = () => {
  const dispatch = useAppDispatch()
  const { continueDesign } = useContinueDesign()
  const [runningFor, setRunningFor] = useState<string | null>(null)

  const generateMobile = async (design: Shape) => {
    const projectId = new URLSearchParams(window.location.search).get('project')
    if (!projectId) {
      toast.error('Open a project first')
      return
    }
    if (runningFor) return
    if (!design.html?.trim()) {
      toast.error('That design is empty')
      return
    }

    setRunningFor(design.id)
    const id = nanoid()

    try {
      const response = await fetch('/api/generate/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, html: design.html }),
      })

      if (!response.ok || !response.body) {
        const message = await response
          .json()
          .then((body: { message?: string }) => body.message)
          .catch(() => null)
        throw new Error(message ?? 'Failed to build the mobile version')
      }

      // Added only once the response is on its way, so a rejected request does
      // not leave an empty panel on the canvas.
      dispatch(
        addGeneratedUI({
          id,
          kind: 'generated-ui',
          x: design.x + design.width + GUTTER,
          y: design.y,
          width: PHONE_WIDTH,
          height: design.height,
          fill: 'transparent',
          sourceFrameId: design.sourceFrameId,
          label: `${design.label ?? 'Design'} — mobile`,
          html: '',
          streaming: true,
        }),
      )

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let markup = ''
      let lastUpdate = 0

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        markup += decoder.decode(value, { stream: true })
        const now = Date.now()
        if (now - lastUpdate >= UPDATE_INTERVAL) {
          lastUpdate = now
          dispatch(setGeneratedHtml({ id, html: markup, streaming: true }))
        }
      }

      markup += decoder.decode()
      const cut = wasTruncated(markup)
      const empty = wasEmpty(markup)

      if (empty) {
        // Nothing usable came back. The route has already put the credit
        // back; say so rather than leaving an empty panel on the canvas.
        dispatch(removeShape(id))
        toast.error('The model returned nothing', {
          description: 'Your credit has been refunded. Try again, or add more detail to the sketch.',
        })
        return
      }

      dispatch(
        setGeneratedHtml({ id, html: stripOutcomeMarkers(markup), streaming: false }),
      )

      if (cut) {
        // Offered rather than done automatically: it costs a credit, and a
        // design that stopped early is sometimes the one the user wanted.
        toast.warning('The design was cut off before it finished', {
          description: 'It ran past the output limit. Continue to write the rest.',
          duration: 30000,
          action: {
            label: 'Continue',
            onClick: () => void continueDesign(id, stripOutcomeMarkers(markup)),
          },
        })
      } else {
        toast.success('Mobile version ready')
      }
    } catch (error) {
      // Clear the spinner on a shape that will never finish.
      dispatch(setGeneratedHtml({ id, html: '', streaming: false }))
      toast.error(
        error instanceof Error ? error.message : 'Failed to build the mobile version',
      )
    } finally {
      setRunningFor(null)
    }
  }

  return { generateMobile, mobileRunningFor: runningFor }
}
