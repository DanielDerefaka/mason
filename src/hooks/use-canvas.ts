'use client'

import { useCallback, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import {
  addShape,
  panBy,
  redo,
  removeShape,
  undo,
  selectShape,
  setTool,
  shapesAdapter,
  wheelPan,
  zoomTo,
  zoomWheel,
  type Point,
  type Shape,
  type ShapeKind,
  type Tool,
} from '@/redux/slice/shapes'
import type { RootState } from '@/redux/store'

const selectors = shapesAdapter.getSelectors()

const FILLS: Record<ShapeKind, string> = {
  rectangle: '#7C6BFF',
  ellipse: '#4ADE80',
  frame: 'transparent',
  text: 'transparent',
  arrow: '#FFFFFF',
  pencil: '#FFFFFF',
  line: '#FFFFFF',
  'generated-ui': 'transparent',
}

/** Kinds captured as a path rather than a bounding box. */
const PATH_KINDS: ShapeKind[] = ['pencil', 'arrow', 'line']

export const useInfiniteCanvas = () => {
  const dispatch = useAppDispatch()
  const state = useAppSelector((s: RootState) => s.shapes)
  const { viewport, tool, selectedId } = state
  const shapes = selectors.selectAll(state.entities)

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const onWheelRef = useRef<(event: WheelEvent) => void>(() => {})
  const gesture = useRef<{ kind: 'pan' | 'draw'; origin: Point; shapeId?: string } | null>(null)
  const [draft, setDraft] = useState<Shape | null>(null)

  /** Screen pixels → world units. The inverse of the CSS transform. */
  const screenToWorld = useCallback(
    (point: Point): Point => ({
      x: (point.x - viewport.translate.x) / viewport.scale,
      y: (point.y - viewport.translate.y) / viewport.scale,
    }),
    [viewport.translate.x, viewport.translate.y, viewport.scale],
  )

  const localPoint = (event: { clientX: number; clientY: number }): Point => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }

  onWheelRef.current = (event: WheelEvent) => {
    // Trackpad pinch arrives as a wheel event with ctrlKey set; a plain wheel
    // is a two-finger scroll and should pan.
    event.preventDefault()
    const origin = localPoint(event)
    if (event.ctrlKey || event.metaKey) {
      dispatch(zoomWheel({ deltaY: event.deltaY, origin }))
    } else {
      dispatch(wheelPan({ dx: event.deltaX, dy: event.deltaY }))
    }
  }

  /**
   * Callback ref rather than useEffect: the wheel listener has to be attached
   * with `{ passive: false }` so preventDefault works, and React's onWheel prop
   * is always passive.
   */
  const attachCanvasRef = useCallback((ref: HTMLDivElement | null) => {
    const handler = (event: WheelEvent) => onWheelRef.current(event)

    if (canvasRef.current) {
      const previous = (canvasRef.current as HTMLDivElement & { _onWheel?: EventListener })._onWheel
      if (previous) canvasRef.current.removeEventListener('wheel', previous)
    }

    canvasRef.current = ref

    if (ref) {
      ;(ref as HTMLDivElement & { _onWheel?: EventListener })._onWheel = handler as EventListener
      ref.addEventListener('wheel', handler, { passive: false })
    }
  }, [])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = localPoint(event)
    ;(event.target as Element).setPointerCapture?.(event.pointerId)

    if (tool === 'hand' || event.button === 1 || event.shiftKey) {
      gesture.current = { kind: 'pan', origin: point }
      return
    }

    if (tool === 'select' || tool === 'eraser') {
      if (tool === 'select') dispatch(selectShape(null))
      return
    }

    // The pan branch above can be taken while a shape tool is active (middle
    // click, shift-drag), so `tool` is not narrowed to a shape kind by control
    // flow alone.
    const kind: ShapeKind = tool
    const world = screenToWorld(point)
    gesture.current = { kind: 'draw', origin: world }
    setDraft({
      id: `draft-${Date.now()}`,
      kind,
      x: world.x,
      y: world.y,
      width: 0,
      height: 0,
      fill: FILLS[kind],
      ...(PATH_KINDS.includes(kind) ? { points: [world] } : {}),
    })
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = gesture.current
    if (!active) return
    const point = localPoint(event)

    if (active.kind === 'pan') {
      dispatch(panBy({ dx: point.x - active.origin.x, dy: point.y - active.origin.y }))
      gesture.current = { ...active, origin: point }
      return
    }

    const world = screenToWorld(point)
    setDraft((current) => {
      if (!current) return current
      const box = {
        x: Math.min(active.origin.x, world.x),
        y: Math.min(active.origin.y, world.y),
        width: Math.abs(world.x - active.origin.x),
        height: Math.abs(world.y - active.origin.y),
      }
      if (current.kind === 'pencil') {
        const points = [...(current.points ?? []), world]
        // The box has to span every sampled point, not just the start and the
        // cursor — the renderer sizes the svg from it, and anything outside
        // gets clipped away.
        const xs = points.map((pt) => pt.x)
        const ys = points.map((pt) => pt.y)
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)
        return {
          ...current,
          points,
          x: minX,
          y: minY,
          width: Math.max(...xs) - minX,
          height: Math.max(...ys) - minY,
        }
      }
      if (current.kind === 'arrow' || current.kind === 'line') {
        return { ...current, ...box, points: [active.origin, world] }
      }
      return { ...current, ...box }
    })
  }

  const onPointerUp = () => {
    const active = gesture.current
    gesture.current = null

    if (active?.kind === 'draw' && draft) {
      // Ignore stray clicks that produce a zero-area shape.
      const isPath = PATH_KINDS.includes(draft.kind)
      const meaningful = isPath
        ? (draft.points?.length ?? 0) > 1 && draft.width + draft.height > 4
        : draft.width > 4 && draft.height > 4
      if (meaningful) {
        dispatch(
          addShape({
            ...draft,
            id: crypto.randomUUID(),
            label: draft.kind === 'frame' ? 'Frame' : undefined,
          }),
        )
        dispatch(setTool('select'))
      }
      setDraft(null)
    }
  }

  const viewportCenter = (): Point => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return { x: (rect?.width ?? 0) / 2, y: (rect?.height ?? 0) / 2 }
  }

  const eraseShape = (id: string) => dispatch(removeShape(id))
  const deleteSelected = () => {
    if (selectedId) dispatch(removeShape(selectedId))
  }

  const zoomIn = () => dispatch(zoomTo({ scale: viewport.scale * 1.2, center: viewportCenter() }))
  const zoomOut = () => dispatch(zoomTo({ scale: viewport.scale / 1.2, center: viewportCenter() }))
  const zoomToScale = (scale: number) => dispatch(zoomTo({ scale, center: viewportCenter() }))

  return {
    attachCanvasRef,
    viewport,
    shapes,
    draft,
    tool,
    selectedId,
    screenToWorld,
    setTool: (next: Tool) => dispatch(setTool(next)),
    selectShape: (id: string | null) => dispatch(selectShape(id)),
    onPointerDown,
    onPointerMove,
    onPointerUp,
    zoomIn,
    zoomOut,
    zoomToScale,
    eraseShape,
    deleteSelected,
    undo: () => dispatch(undo()),
    redo: () => dispatch(redo()),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}
