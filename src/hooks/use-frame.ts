'use client'

import { useState } from 'react'
import { nanoid } from '@reduxjs/toolkit'
import { toast } from 'sonner'

import { stripOutcomeMarkers, wasEmpty, wasTruncated } from '@/lib/truncation'
import {
  DESIGN_GENERATED_EVENT,
  generateFetch,
  noteGenerateRefusal,
  type DesignGeneratedDetail,
} from '@/lib/try/generate-fetch'
import { useContinueDesign } from '@/hooks/use-continue-design'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import {
  addGeneratedUI,
  removeShape,
  setGeneratedHtml,
  shapesAdapter,
  type Shape,
} from '@/redux/slice/shapes'
import type { RootState } from '@/redux/store'
import { rasteriseFrame } from '@/lib/rasterise'

const selectors = shapesAdapter.getSelectors()

/** Gap between a frame and the design generated from it. */
const GUTTER = 80

/** Repainting on every chunk pegs a CPU; a design lands in ~40 updates instead. */
const UPDATE_INTERVAL = 200

export const useFrame = () => {
  const dispatch = useAppDispatch()
  const { continueDesign } = useContinueDesign()
  const entities = useAppSelector((state: RootState) => state.shapes.entities)
  const shapes = selectors.selectAll(entities)
  const [generatingFrameId, setGeneratingFrameId] = useState<string | null>(null)

  const generateDesign = async (frame: Shape) => {
    const projectId = new URLSearchParams(window.location.search).get('project')
    if (!projectId) {
      toast.error('Open a project first')
      return
    }
    if (generatingFrameId) return

    setGeneratingFrameId(frame.id)
    const id = nanoid()

    try {
      const image = await rasteriseFrame(frame, shapes)

      const form = new FormData()
      form.append('image', image, 'frame.png')
      form.append('projectId', projectId)
      form.append('frameLabel', frame.label ?? '')
      // Empty rather than absent, so the route sees the field either way.
      form.append('instruction', frame.instruction ?? '')

      const response = await generateFetch('/api/generate', { method: 'POST', body: form })

      if (!response.ok || !response.body) {
        const refusal = noteGenerateRefusal(response)
        const message = await response
          .json()
          .then((body: { message?: string }) => body.message)
          .catch(() => null)
        throw new Error(refusal ?? message ?? 'Failed to generate the design')
      }

      // Added only once the response is on its way, so a rejected request does
      // not leave an empty panel on the canvas.
      dispatch(
        addGeneratedUI({
          id,
          kind: 'generated-ui',
          x: frame.x + frame.width + GUTTER,
          y: frame.y,
          width: frame.width,
          height: frame.height,
          fill: 'transparent',
          sourceFrameId: frame.id,
          label: frame.label,
          instruction: frame.instruction,
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

      // The /try shell publishes to Explore from this; the dashboard has no
      // listener. The sketch is the PNG the model was shown, so the gallery
      // shows exactly what produced the design.
      window.dispatchEvent(
        new CustomEvent<DesignGeneratedDetail>(DESIGN_GENERATED_EVENT, {
          detail: { designId: id, frameId: frame.id, sketch: image },
        }),
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
        toast.success('Design generated')
      }
    } catch (error) {
      // Clear the spinner on a shape that will never finish.
      dispatch(setGeneratedHtml({ id, html: '', streaming: false }))

      /**
       * "Failed to fetch" is what the browser says when the connection dropped
       * before the response finished, and on its own it sends you looking at
       * your own code. The cause is almost always the model endpoint hanging
       * up on a long generation, which is a different problem with a different
       * fix, so say so.
       */
      const message = error instanceof Error ? error.message : ''
      const dropped = /failed to fetch|network|load failed|terminated/i.test(message)

      toast.error(dropped ? 'The connection to the model dropped' : message || 'Failed to generate the design', {
        description: dropped
          ? 'The design was still being written when the connection closed. Your credit has been returned — try again, and if it keeps happening the model endpoint is the thing to look at, not the sketch.'
          : undefined,
      })
    } finally {
      setGeneratingFrameId(null)
    }
  }

  return { generateDesign, generatingFrameId }
}
