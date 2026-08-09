'use client'

import { useState } from 'react'
import { nanoid } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import { useAppDispatch } from '@/redux/hooks'
import { addGeneratedUI, setGeneratedHtml, type Shape } from '@/redux/slice/shapes'

/** How many screens a flow produces. One credit each, so this is the price. */
export const WORKFLOW_PAGE_COUNT = 3

const GUTTER = 100
const UPDATE_INTERVAL = 200

type PlannedPage = { title: string; purpose: string }

/**
 * Turns one generated screen into the flow around it.
 *
 * The video hardcodes the four page types and says on camera not to do it that
 * way — the screens then have nothing to do with the design they came from. So
 * the model is asked to plan the flow from the source screen first, and each
 * planned page is generated against that plan.
 */
export const useWorkflow = () => {
  const dispatch = useAppDispatch()
  const [runningFor, setRunningFor] = useState<string | null>(null)

  const generateWorkflow = async (source: Shape) => {
    if (runningFor) return

    if (source.kind !== 'generated-ui' || !source.html?.trim()) {
      toast.error('Generate a design first, then build the flow around it')
      return
    }
    const projectId = new URLSearchParams(window.location.search).get('project')
    if (!projectId) {
      toast.error('Open a project first')
      return
    }

    setRunningFor(source.id)
    toast.loading('Planning the flow…', { id: 'workflow' })

    try {
      const planResponse = await fetch('/api/generate/workflow/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceHtml: source.html, pageCount: WORKFLOW_PAGE_COUNT }),
      })
      if (!planResponse.ok) {
        const body = (await planResponse.json().catch(() => null)) as { message?: string } | null
        throw new Error(body?.message ?? 'Could not plan the flow')
      }
      const { pages } = (await planResponse.json()) as { pages: PlannedPage[] }
      if (pages.length === 0) throw new Error('The plan came back empty')

      // Lay the flow out to the right of the source, evenly spaced.
      const spacing = Math.max(450, source.width + 50)
      const baseX = source.x + source.width + GUTTER

      for (const [index, page] of pages.entries()) {
        const id = nanoid()
        toast.loading(`Designing ${page.title} (${index + 1} of ${pages.length})…`, {
          id: 'workflow',
        })

        dispatch(
          addGeneratedUI({
            id,
            kind: 'generated-ui',
            x: baseX + index * spacing,
            y: source.y,
            width: source.width,
            height: source.height,
            fill: 'transparent',
            sourceFrameId: source.id,
            label: page.title,
            html: '',
            streaming: true,
          }),
        )

        const response = await fetch('/api/generate/workflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            sourceHtml: source.html,
            title: page.title,
            purpose: page.purpose,
          }),
        })

        if (!response.ok || !response.body) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null
          dispatch(setGeneratedHtml({ id, html: '', streaming: false }))
          throw new Error(body?.message ?? `Could not design ${page.title}`)
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
            dispatch(setGeneratedHtml({ id, html: markup, streaming: true }))
          }
        }

        markup += decoder.decode()
        dispatch(setGeneratedHtml({ id, html: markup, streaming: false }))
      }

      toast.success(
        `${pages.length} screen${pages.length === 1 ? '' : 's'} added to the flow`,
        { id: 'workflow' },
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to build the flow', {
        id: 'workflow',
      })
    } finally {
      setRunningFor(null)
    }
  }

  return { generateWorkflow, workflowRunningFor: runningFor }
}
