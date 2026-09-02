'use client'

import { toast } from 'sonner'
import { useContinueDesign } from '@/hooks/use-continue-design'
import { revisionOutcome } from '@/lib/revision-outcome'
import { generateFetch, noteGenerateRefusal } from '@/lib/try/generate-fetch'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import type { ChatMessage } from '@/redux/slice/chat'
import {
  addUserMessage,
  closeChat,
  endAssistantMessage,
  setAssistantText,
  startAssistantMessage,
  toggleChat,
} from '@/redux/slice/chat'
import { setGeneratedHtml, shapesAdapter, type Shape } from '@/redux/slice/shapes'
import type { RootState } from '@/redux/store'

const selectors = shapesAdapter.getSelectors()
const UPDATE_INTERVAL = 200

/** What the assistant says while the design streams in behind it. */
const WORKING = 'Redesigning…'
const DONE = 'Done. The design has been updated.'
const CUT_OFF =
  'The revision was cut off before it finished. Continue to write the rest, or ask for a smaller change.'

export const useDesignChat = () => {
  const dispatch = useAppDispatch()
  const { continueDesign } = useContinueDesign()
  const openFor = useAppSelector((state: RootState) => state.chat.openFor)
  const byShape = useAppSelector((state: RootState) => state.chat.byShape)
  const entities = useAppSelector((state: RootState) => state.shapes.entities)

  const conversation = openFor ? byShape[openFor] : undefined
  const shape = openFor ? selectors.selectById(entities, openFor) : undefined

  const send = async (instruction: string) => {
    const trimmed = instruction.trim()
    if (!trimmed || !openFor || !shape) return
    if (conversation?.streamingId) return

    const design = shape as Shape
    if (!design.html?.trim()) {
      toast.error('Generate the design before asking for changes')
      return
    }

    const projectId = new URLSearchParams(window.location.search).get('project')
    if (!projectId) {
      toast.error('Open a project first')
      return
    }

    dispatch(addUserMessage(openFor, trimmed))
    const started = dispatch(startAssistantMessage(openFor))
    const messageId = started.payload.id
    dispatch(setAssistantText({ shapeId: openFor, id: messageId, text: WORKING }))

    // Kept so a failed revision can put the design back the way it was.
    const previousHtml = design.html

    try {
      const response = await generateFetch('/api/generate/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, html: previousHtml, instruction: trimmed }),
      })

      if (!response.ok || !response.body) {
        const refusal = noteGenerateRefusal(response)
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        throw new Error(refusal ?? body?.message ?? 'Could not revise the design')
      }

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
          dispatch(setGeneratedHtml({ id: openFor, html: markup, streaming: true }))
        }
      }

      markup += decoder.decode()

      // The route marks an answer it could not finish rather than failing the
      // stream, so a clean read is not the same as a usable design. Storing
      // the body as it came stored the marker, which the sanitiser drops: an
      // empty answer became a blank shape, a cut-off one half a page, and the
      // message underneath said Done.
      const outcome = revisionOutcome(markup)
      if (outcome.kind === 'empty') {
        throw new Error('The model returned nothing, so the design was left as it was')
      }

      dispatch(setGeneratedHtml({ id: openFor, html: outcome.html, streaming: false }))
      dispatch(
        setAssistantText({
          shapeId: openFor,
          id: messageId,
          text: outcome.kind === 'truncated' ? CUT_OFF : DONE,
        }),
      )

      if (outcome.kind === 'truncated') {
        // Kept rather than thrown away: most of the revision is there, and the
        // continuation route writes only the remainder. Offered, not run, for
        // the same reason the canvas offers it: it costs a credit.
        const shapeId = openFor
        toast.warning('The revision was cut off before it finished', {
          description: 'It ran past the output limit. Continue to write the rest.',
          duration: 30000,
          action: {
            label: 'Continue',
            onClick: () => void continueDesign(shapeId, outcome.html),
          },
        })
      }
    } catch (error) {
      // A half-written revision is worse than the design they had.
      dispatch(setGeneratedHtml({ id: openFor, html: previousHtml, streaming: false }))
      const message = error instanceof Error ? error.message : 'Could not revise the design'
      dispatch(setAssistantText({ shapeId: openFor, id: messageId, text: message }))
      toast.error(message)
    } finally {
      dispatch(endAssistantMessage({ shapeId: openFor }))
    }
  }

  return {
    openFor,
    shape: shape as Shape | undefined,
    messages: (conversation?.messages ?? []) as ChatMessage[],
    streaming: Boolean(conversation?.streamingId),
    send,
    toggle: (shapeId: string) => dispatch(toggleChat(shapeId)),
    close: () => dispatch(closeChat()),
  }
}
