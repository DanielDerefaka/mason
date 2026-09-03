'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useAppDispatch, useAppSelector, useAppStore } from '@/redux/hooks'
import { readSketches, setShapes, setViewport, shapesAdapter, type Viewport } from '@/redux/slice/shapes'
import type { RootState } from '@/redux/store'

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

/** How long the canvas has to be still before it is written. */
export const DEBOUNCE_MS = 1200
const selectors = shapesAdapter.getSelectors()

type Entities = RootState['shapes']['entities']

/** The last state the server was given, held by reference. */
type Saved = { entities: Entities; viewport: Viewport }

const anyStreaming = (entities: Entities) =>
  selectors.selectAll(entities).some((shape) => shape.streaming === true)

/**
 * Writes the canvas to the project a while after it stops changing.
 *
 * The effect that watches the store only ever arms a timer. It used to
 * stringify every shape and call `setStatus('unsaved')` from inside the same
 * commit as the change it was reacting to, which for a controlled input
 * meant a state update scheduled from within the keystroke's own render:
 * React gave up at its nesting limit (error 185) and the keystroke that
 * tripped it was lost, so a sentence typed into the instruction bar arrived
 * with letters missing. Everything that costs anything, the serialising, the
 * comparing and the status changes, now happens when the timer fires, and
 * "unsaved" is derived in render from whether the table is the one last
 * written.
 */
export const useAutosave = () => {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') as Id<'projects'> | null

  const entities = useAppSelector((s: RootState) => s.shapes.entities)
  const viewport = useAppSelector((s: RootState) => s.shapes.viewport)
  const streaming = useAppSelector((s: RootState) => anyStreaming(s.shapes.entities))

  const project = useQuery(api.project.getProject, projectId ? { projectId } : 'skip')
  const save = useMutation(api.project.updateProjectSketches)

  const [status, setStatus] = useState<SaveStatus>('idle')
  const [saved, setSaved] = useState<Saved | null>(null)
  const savedRef = useRef(saved)
  savedRef.current = saved

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Whether the store has changed since the last write was sent. */
  const pending = useRef(false)
  /** What the server holds, serialised, so a write that changes nothing is skipped. */
  const baseline = useRef<{ shapes: string; viewport: string } | null>(null)
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

  /**
   * Sends whatever the store holds now to project `id`. Reads the store
   * directly rather than a render's copy, so a write sent on the way out of
   * the canvas carries the last change and not the last render.
   */
  const flush = useCallback(
    async (id: Id<'projects'>) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      pending.current = false
      // Compared against the id rather than read as a flag: a save must never
      // run while the canvas still holds the sketch we have just navigated
      // away from, or it lands in the wrong project.
      if (hydratedFor.current !== id) return

      const current = store.getState().shapes
      const shapes = selectors.selectAll(current.entities)
      const serialisedShapes = JSON.stringify(shapes)
      const serialisedViewport = JSON.stringify(current.viewport)
      const shapesChanged = serialisedShapes !== baseline.current?.shapes
      const viewportChanged = serialisedViewport !== baseline.current?.viewport
      const written: Saved = { entities: current.entities, viewport: current.viewport }

      // A new table with the same content, which is what a store update that
      // changed nothing leaves behind. Nothing to send; noting the reference
      // is what lets the indicator settle back to "saved".
      if (!shapesChanged && !viewportChanged) {
        setSaved(written)
        return
      }

      // The person may have moved to another sketch by the time the write
      // returns, and its baseline and status belong to the one it was for.
      const stillHere = () => hydratedFor.current === id
      // Panning is not an unsaved change, so the indicator stays quiet for it.
      if (shapesChanged) setStatus('saving')
      try {
        await save({
          projectId: id,
          sketchesData: { frameCounter: shapes.length, shapes, viewport: current.viewport },
          // A viewport-only write must not read as an edit.
          touch: shapesChanged,
        })
        if (!stillHere()) return
        baseline.current = { shapes: serialisedShapes, viewport: serialisedViewport }
        setSaved(written)
        if (shapesChanged) setStatus('saved')
      } catch {
        if (stillHere() && shapesChanged) setStatus('error')
      }
    },
    [save, store],
  )

  // Load the stored sketch once per project, and record it as the baseline so
  // hydration does not immediately look like an unsaved change.
  useEffect(() => {
    if (!projectId || hydratedFor.current === projectId) return
    if (project === undefined || project === null || project._id !== projectId) return
    // Any write still waiting belongs to the sketch being left, and the
    // cleanup keyed on its id has already sent it.
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    pending.current = false
    hydratedFor.current = projectId

    const { shapes: loaded, viewport: storedViewport } = readSketches(project.sketchesData)
    dispatch(setShapes(loaded))
    // Pan and zoom were previously thrown away on every reload, which on a
    // 1512-wide frame left you parked inside its edge looking at blank canvas.
    if (storedViewport) dispatch(setViewport(storedViewport))

    // The baseline is what the store holds after hydration, not what the row
    // held: `setShapes` settles a stream a closed tab left behind and
    // `setViewport` clamps the scale, so the two can differ, and the first
    // write should be for a change somebody made.
    const current = store.getState().shapes
    baseline.current = {
      shapes: JSON.stringify(selectors.selectAll(current.entities)),
      viewport: JSON.stringify(current.viewport),
    }
    setSaved({ entities: current.entities, viewport: current.viewport })
    setStatus('saved')
  }, [project, projectId, dispatch, store])

  // Arms the timer, and does nothing else: no state update may be scheduled
  // from here, or a keystroke is a render that schedules a render.
  useEffect(() => {
    if (!projectId || hydratedFor.current !== projectId) return
    const last = savedRef.current
    if (last && entities === last.entities && viewport === last.viewport) return
    // Nothing is written while a design is still arriving. Each chunk used to
    // re-arm the timer, so any pause in the stream longer than the debounce
    // wrote a half-finished design and flipped the header between "Saved" and
    // "Unsaved changes" for the rest of it; the write waits for the end.
    if (streaming) return

    pending.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(projectId), DEBOUNCE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [entities, viewport, streaming, projectId, flush])

  // Whatever is still waiting for the debounce goes out when the canvas is
  // left, whether by unmounting or by switching to another sketch. The
  // cleanup used to clear the timer and drop the write with it, so leaving
  // for the editor within 1.2 s of a change lost the change, and the canvas
  // rehydrated from the server's older copy on the way back.
  useEffect(() => {
    if (!projectId) return
    return () => {
      if (pending.current) void flush(projectId)
    }
  }, [projectId, flush])

  // Derived rather than set: the table is unsaved when it is not the one
  // last written, and that is known without scheduling anything.
  const dirty = saved !== null && entities !== saved.entities
  const shown: SaveStatus = status === 'saved' && dirty ? 'unsaved' : status

  return { status: shown, hydrated: hydratedFor.current === projectId }
}
