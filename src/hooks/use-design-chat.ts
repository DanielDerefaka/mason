'use client'

import { toast } from 'sonner'
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
const DONE = 'Done — the design has been updated.'

export const useDesignChat = () => {
  const dispatch = useAppDispatch()
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
      if (!markup.trim()) throw new Error('The revision came back empty')

      dispatch(setGeneratedHtml({ id: openFor, html: markup, streaming: false }))
      dispatch(setAssistantText({ shapeId: openFor, id: messageId, text: DONE }))
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
