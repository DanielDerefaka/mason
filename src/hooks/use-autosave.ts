'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { setShapes, setViewport, shapesAdapter, type Shape, type Viewport } from '@/redux/slice/shapes'
import type { RootState } from '@/redux/store'

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

const DEBOUNCE_MS = 1200
const selectors = shapesAdapter.getSelectors()

export const useAutosave = () => {
  const dispatch = useAppDispatch()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') as Id<'projects'> | null

  const entities = useAppSelector((s: RootState) => s.shapes.entities)
  const shapes = selectors.selectAll(entities)
  const viewport = useAppSelector((s: RootState) => s.shapes.viewport)

  const project = useQuery(api.project.getProject, projectId ? { projectId } : 'skip')
  const save = useMutation(api.project.updateProjectSketches)

  const [status, setStatus] = useState<SaveStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string | null>(null)
  /**
   * Which project the canvas currently holds — not merely whether it holds
   * one.
   *
   * This was a boolean, which was true for as long as /try had a single
   * project it never left. The moment a guest can switch sketches it becomes
   * a way to lose one: the hook would decline to hydrate the sketch just
   * opened, and the save effect below would then write the *previous*
   * canvas into it under its new id. Keyed on the id, a switch rehydrates
   * and no write leaves before it has.
   */
  const hydratedFor = useRef<string | null>(null)
  const lastViewportRef = useRef<string | null>(null)
  const shapesRef = useRef(shapes)
  shapesRef.current = shapes

  // Load the stored sketch once per project, and record it as the baseline so
  // hydration does not immediately look like an unsaved change.
  useEffect(() => {
    if (!projectId || hydratedFor.current === projectId) return
    if (project === undefined || project === null || project._id !== projectId) return
    // Any debounced write still pending belongs to the sketch being left.
    if (debounceRef.current) clearTimeout(debounceRef.current)
    hydratedFor.current = projectId

    const stored = (project.sketchesData ?? {}) as { shapes?: Shape[]; viewport?: Viewport }
    const loaded = Array.isArray(stored.shapes) ? stored.shapes : []
    dispatch(setShapes(loaded))
    // Pan and zoom were previously thrown away on every reload, which on a
    // 1512-wide frame left you parked inside its edge looking at blank canvas.
    if (stored.viewport && typeof stored.viewport.scale === 'number') {
      dispatch(setViewport(stored.viewport))
    }
    lastSavedRef.current = JSON.stringify(loaded)
    lastViewportRef.current = JSON.stringify(stored.viewport ?? null)
    setStatus('saved')
  }, [project, projectId, dispatch])

  useEffect(() => {
    // Compared against the id rather than read as a flag: a save must never
    // run while the canvas still holds the sketch we have just navigated away
    // from, or it lands in the wrong project.
    if (!projectId || hydratedFor.current !== projectId) return

    const serialisedShapes = JSON.stringify(shapes)
    const serialisedViewport = JSON.stringify(viewport)
    const shapesChanged = serialisedShapes !== lastSavedRef.current
    const viewportChanged = serialisedViewport !== lastViewportRef.current
    if (!shapesChanged && !viewportChanged) return

    // Panning is not an unsaved change, so the indicator stays quiet for it.
    if (shapesChanged) setStatus('unsaved')
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      if (shapesChanged) setStatus('saving')
      void save({
        projectId,
        sketchesData: {
          frameCounter: shapesRef.current.length,
          shapes: shapesRef.current,
          viewport,
        },
        // A viewport-only write must not read as an edit.
        touch: shapesChanged,
      })
        .then(() => {
          lastSavedRef.current = serialisedShapes
          lastViewportRef.current = serialisedViewport
          if (shapesChanged) setStatus('saved')
        })
        .catch(() => {
          if (shapesChanged) setStatus('error')
        })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [shapes, viewport, projectId, save])

  return { status, hydrated: hydratedFor.current === projectId }
}
