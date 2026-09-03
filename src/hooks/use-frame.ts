'use client'

import { useState } from 'react'
import { nanoid } from '@reduxjs/toolkit'
import { toast } from 'sonner'

import { track } from '@/lib/analytics'
import { isUnusable, stripOutcomeMarkers, wasEmpty, wasTruncated } from '@/lib/truncation'
import {
  DESIGN_GENERATED_EVENT,
  generateFetch,
  noteGenerateRefusal,
  toastRetryCountdown,
  type DesignGeneratedDetail,
} from '@/lib/try/generate-fetch'
import { useContinueDesign } from '@/hooks/use-continue-design'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import {
  addGeneratedUI,
  focusOnRect,
  discardGeneratedUI,
  setGeneratedHtml,
  shapesAdapter,
  type Shape,
} from '@/redux/slice/shapes'
import type { RootState } from '@/redux/store'
import { describeFrame } from '@/lib/frame-manifest'
import { rasteriseFrameWithReport } from '@/lib/rasterise'

const selectors = shapesAdapter.getSelectors()

/** Gap between a frame and the design generated from it. */
const GUTTER = 80

/** Repainting on every chunk pegs a CPU; a design lands in ~40 updates instead. */
const UPDATE_INTERVAL = 200

/**
 * What a refused request throws, so the catch can act on the refusal without
 * a second throw site: the status for the count, and whatever
 * `noteGenerateRefusal` decided about how to say it.
 */
type GenerationRefused = Error & {
  status?: number
  description?: string
  retryAfter?: number
  sheetOpened?: boolean
}

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
    if (generatingFrameId) {
      // One at a time, and said so. A second Generate used to return here in
      // silence, which on a frame with its own pill reads as a click that did
      // not register, and gets pressed again.
      toast.info('One design at a time', {
        description:
          'The one already running will finish first. Press Generate again once it has landed.',
      })
      return
    }

    setGeneratingFrameId(frame.id)
    const id = nanoid()
    track('generate_clicked')

    // Both outlive the try: the catch needs to know whether the panel exists
    // and how much of the page reached it.
    let placed = false
    let markup = ''

    try {
      // A photo that failed to load is painted as a labelled placeholder
      // rather than left blank, and the count comes back so the person is
      // told. Silence here is how a design arrives with a grey box where
      // their sketch was and nothing explains it.
      const { blob: image, missingImages } = await rasteriseFrameWithReport(frame, shapes)
      if (missingImages) {
        toast.warning(
          `${missingImages} image${missingImages === 1 ? '' : 's'} could not be loaded`,
          {
            description:
              'A placeholder was sent in its place, so the design still gets a picture there.',
          },
        )
      }
      // The same shapes the picture was drawn from, as words: where each
      // element is, how big, what it holds and what points at it, so the
      // model reads the geometry as numbers rather than estimating it from
      // purple blocks.
      const manifest = describeFrame(frame, shapes)

      // Placed before the request goes out, not once the response is on its
      // way. The route holds its headers until the model's first word, which
      // is most of a minute after the click, and for all of it the canvas
      // showed that nothing had happened. The panel now stands where the
      // design will land and says what stage it is at; a refusal removes it
      // in the catch, which is what the old ordering was for.
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
      placed = true

      // Sketch and design in one view. The design sits a gutter to the right
      // of the frame, which at a zoom chosen for drawing is off the screen,
      // and a page that appeared out of sight was a page that had not.
      dispatch(
        focusOnRect({
          x: frame.x,
          y: frame.y,
          width: frame.width * 2 + GUTTER,
          height: frame.height,
          viewWidth: window.innerWidth,
          viewHeight: Math.max(240, window.innerHeight - 120),
        }),
      )

      const form = new FormData()
      form.append('image', image, 'frame.png')
      form.append('projectId', projectId)
      form.append('frameLabel', frame.label ?? '')
      // Empty rather than absent, so the route sees the field either way.
      form.append('instruction', frame.instruction ?? '')
      form.append('manifest', manifest)

      const response = await generateFetch('/api/generate', { method: 'POST', body: form })

      if (!response.ok || !response.body) {
        const refusal = noteGenerateRefusal(response)
        const message = await response
          .json()
          .then((body: { message?: string }) => body.message)
          .catch(() => null)
        // The status rides on the error so the catch can count which refusal
        // this was without a second throw site.
        throw Object.assign(
          new Error(refusal.message ?? message ?? 'Failed to generate the design'),
          {
            status: response.status,
            description: refusal.description,
            retryAfter: refusal.retryAfter,
            sheetOpened: refusal.sheetOpened,
          },
        )
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
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
        track('generation_empty')
        // Nothing usable came back. The route has already put the credit
        // back; say so rather than leaving an empty panel on the canvas.
        dispatch(discardGeneratedUI(id))
        toast.error('The model returned nothing', {
          description: 'Your credit has been refunded. Try again, or add more detail to the sketch.',
        })
        return
      }

      dispatch(
        setGeneratedHtml({ id, html: stripOutcomeMarkers(markup), streaming: false }),
      )
      // A cut design is still a design on the canvas, so it counts as one.
      track('generation_succeeded', { truncated: cut })

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
      const refused = error as GenerationRefused
      const message = error instanceof Error ? error.message : ''

      /**
       * "Failed to fetch" is what the browser says when the connection dropped
       * before the response finished, and on its own it sends you looking at
       * your own code. The cause is almost always the model endpoint hanging
       * up on a long generation, which is a different problem with a different
       * fix, so say so.
       */
      const dropped =
        refused.status === undefined && /failed to fetch|network|load failed|terminated/i.test(message)
      track('generation_failed', {
        status: refused.status ?? (dropped ? 'dropped' : 'error'),
      })

      /**
       * What arrived stays. A dropped stream used to blank the panel and leave
       * it reading "waiting for the first chunk" for good, with four-fifths of
       * a page thrown away; that is the case Continue exists for. Nothing is
       * promised about the credit here, because the browser cannot tell its
       * own connection dropping from the model's, and the route treats the
       * two differently.
       */
      const kept = stripOutcomeMarkers(markup)
      if (placed && !isUnusable(kept)) {
        dispatch(setGeneratedHtml({ id, html: kept, streaming: false }))
        toast.warning('The page stopped before it finished', {
          description: dropped
            ? 'The connection dropped. What arrived is on the canvas, and Continue writes the rest.'
            : 'What arrived is on the canvas, and Continue writes the rest.',
          duration: 30000,
          action: { label: 'Continue', onClick: () => void continueDesign(id, kept) },
        })
        return
      }
      // Nothing worth keeping, so no empty panel either. Discarded rather
      // than removed: a removal is a step in history, and a generation that
      // produced nothing must not leave the person two undos away from the
      // canvas they drew.
      if (placed) dispatch(discardGeneratedUI(id))

      // The sheet is already the answer; a toast over it said the same thing twice.
      if (refused.sheetOpened) return
      if (refused.retryAfter) {
        toastRetryCountdown(message, refused.retryAfter)
        return
      }
      if (dropped) {
        toast.error('The connection to the model dropped', {
          description:
            'Nothing had arrived, so nothing was kept. Try again, and if it keeps happening the model endpoint is the thing to look at, not the sketch.',
        })
        return
      }
      toast.error(message || 'Failed to generate the design', { description: refused.description })
    } finally {
      setGeneratingFrameId(null)
    }
  }

  return { generateDesign, generatingFrameId }
}
