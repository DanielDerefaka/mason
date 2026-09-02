'use client'

import { useMutation, useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { track } from '@/lib/analytics'
import { CHECKPOINT_MS } from '@/lib/design-history'
import type { Shape } from '@/redux/slice/shapes'
import { StyleGuideSchema } from '@/types/style-guide'

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

const DEBOUNCE_MS = 900

/**
 * Loads one generated design for the standalone editor.
 *
 * Deliberately not the canvas's Redux store. The editor mutates a live DOM
 * rather than shape geometry, its undo history is its own, and mounting the
 * canvas's autosave here would mean two writers on the same project row.
 * It reads the shape it needs, writes that one shape back, and leaves the
 * rest of `sketchesData` exactly as it found it.
 */
export const useDesignEditor = () => {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') as Id<'projects'> | null
  const designId = searchParams.get('design')

  const project = useQuery(api.project.getProject, projectId ? { projectId } : 'skip')
  const save = useMutation(api.project.updateProjectSketches)
  const setThumbnail = useMutation(api.project.setProjectThumbnail)
  const checkpoint = useMutation(api.design_versions.checkpoint)

  const [status, setStatus] = useState<SaveStatus>('idle')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string | null>(null)
  /**
   * When this tab last offered the design's previous markup to the history.
   *
   * The interval that decides whether an offer becomes a row is enforced on
   * the server, so reopening the editor twenty times cannot spend twenty
   * entries. This ref only keeps the tab from asking on every save, which at a
   * 900ms debounce is often. Starting at zero means the first save after a
   * mount always asks, which is the one that matters: it records the state the
   * design was found in, before anything here touched it.
   */
  const lastCheckpoint = useRef(0)

  const stored = (project?.sketchesData ?? {}) as { shapes?: Shape[] }
  const shapes = Array.isArray(stored.shapes) ? stored.shapes : []
  const design = shapes.find((shape) => shape.id === designId) ?? null

  const guide = StyleGuideSchema.safeParse(project?.styleGuide)
  const styleGuide = guide.success ? guide.data : null

  useEffect(() => {
    if (design && lastSaved.current === null) lastSaved.current = design.html ?? ''
  }, [design])

  /**
   * Opening a design makes it the project's picture.
   *
   * Both the editor and the preview run through this hook, which is why the
   * capture lives here rather than in either of them — the design somebody
   * last looked at is the best available guess at what a project is, and it
   * costs nothing to record. The mutation refuses to overwrite a picture that
   * was chosen deliberately, so browsing cannot undo a decision.
   */
  const marked = useRef<string | null>(null)
  useEffect(() => {
    if (!projectId || !designId || !design?.html?.trim()) return
    if (marked.current === designId) return
    marked.current = designId
    track('design_opened')
    void setThumbnail({ projectId, designId, pinned: false }).catch(() => {
      // A thumbnail is decoration; failing to set one must not interrupt
      // editing the design it came from.
    })
  }, [projectId, designId, design?.html, setThumbnail])

  /**
   * Offers the markup the design has just stopped being to the history.
   *
   * After a save that succeeded rather than before it, so a save that failed
   * cannot leave behind a row describing a state the design never left. Most
   * offers are refused, by the ref here or by the interval on the server;
   * `design_versions.checkpoint` explains why asking often is the cheap half.
   */
  const offerCheckpoint = (previous: string | null) => {
    if (!projectId || !designId || previous === null) return
    const now = Date.now()
    if (now - lastCheckpoint.current < CHECKPOINT_MS) return
    lastCheckpoint.current = now
    void checkpoint({ projectId, designId, html: previous }).catch(() => {
      // The history is a safety net under editing, not a part of it. A
      // checkpoint that does not happen must never surface as a failed edit.
    })
  }

  /**
   * Writes the edited markup back into its shape.
   *
   * The shapes array is rebuilt from what was just read rather than from a
   * cached copy, so a canvas open in another tab that moved a rectangle does
   * not have that move undone by this save.
   */
  const saveHtml = (html: string) => {
    if (!projectId || !designId) return
    if (html === lastSaved.current) return

    setStatus('unsaved')
    if (debounce.current) clearTimeout(debounce.current)

    debounce.current = setTimeout(() => {
      setStatus('saving')
      // Read inside the timeout, so it is the last markup actually written
      // rather than whatever was on screen when this save was asked for.
      const previous = lastSaved.current
      const next = shapes.map((shape) =>
        shape.id === designId ? { ...shape, html } : shape,
      )
      void save({
        projectId,
        sketchesData: { ...stored, shapes: next },
      })
        .then(() => {
          lastSaved.current = html
          setStatus('saved')
          offerCheckpoint(previous)
        })
        .catch(() => setStatus('error'))
    }, DEBOUNCE_MS)
  }

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current)
    },
    [],
  )

  return {
    projectId,
    designId,
    design,
    styleGuide,
    loading: project === undefined,
    status,
    saveHtml,
  }
}
