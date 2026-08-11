'use client'

import { useState } from 'react'
import { nanoid } from '@reduxjs/toolkit'
import { toast } from 'sonner'

import { stripTruncationMarker, wasTruncated } from '@/lib/truncation'
import { useContinueDesign } from '@/hooks/use-continue-design'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import {
  addGeneratedUI,
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

      const response = await fetch('/api/generate', { method: 'POST', body: form })

      if (!response.ok || !response.body) {
        const message = await response
          .json()
          .then((body: { message?: string }) => body.message)
          .catch(() => null)
        throw new Error(message ?? 'Failed to generate the design')
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
      dispatch(
        setGeneratedHtml({ id, html: stripTruncationMarker(markup), streaming: false }),
      )

      if (cut) {
        // Offered rather than done automatically: it costs a credit, and a
        // design that stopped early is sometimes the one the user wanted.
        toast.warning('The design was cut off before it finished', {
          description: 'It ran past the output limit. Continue to write the rest.',
          duration: 30000,
          action: {
            label: 'Continue',
            onClick: () => void continueDesign(id, stripTruncationMarker(markup)),
          },
        })
      } else {
        toast.success('Design generated')
      }
    } catch (error) {
      // Clear the spinner on a shape that will never finish.
      dispatch(setGeneratedHtml({ id, html: '', streaming: false }))
      toast.error(error instanceof Error ? error.message : 'Failed to generate the design')
    } finally {
      setGeneratingFrameId(null)
    }
  }

  return { generateDesign, generatingFrameId }
}
