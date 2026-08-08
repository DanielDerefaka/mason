'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { setShapes, shapesAdapter, type Shape } from '@/redux/slice/shapes'
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

  const project = useQuery(api.project.getProject, projectId ? { projectId } : 'skip')
  const save = useMutation(api.project.updateProjectSketches)

  const [status, setStatus] = useState<SaveStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string | null>(null)
  const hydratedRef = useRef(false)

  // Load the stored sketch once, and record it as the baseline so hydration
  // does not immediately look like an unsaved change.
  useEffect(() => {
    if (hydratedRef.current || project === undefined || project === null) return
    hydratedRef.current = true

    const stored = (project.sketchesData ?? {}) as { shapes?: Shape[] }
    const loaded = Array.isArray(stored.shapes) ? stored.shapes : []
    dispatch(setShapes(loaded))
    lastSavedRef.current = JSON.stringify(loaded)
    setStatus('saved')
  }, [project, dispatch])

  useEffect(() => {
    if (!projectId || !hydratedRef.current) return

    const serialised = JSON.stringify(shapes)
    // Nothing changed — skip the write rather than touching lastModified.
    if (serialised === lastSavedRef.current) return

    setStatus('unsaved')
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      setStatus('saving')
      void save({
        projectId,
        sketchesData: { frameCounter: shapes.length, shapes },
      })
        .then(() => {
          lastSavedRef.current = serialised
          setStatus('saved')
        })
        .catch(() => setStatus('error'))
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [shapes, projectId, save])

  return { status, hydrated: hydratedRef.current }
}
