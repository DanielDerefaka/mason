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
  snapshotHistory,
  updateShapeLive,
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

/** Corner grips, named for the corner they own. */
export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw'

/** Stops a shape being dragged inside out. */
const MIN_SIZE = 8

/**
 * Moves a shape, carrying its path with it — a path's points are world
 * coordinates, so shifting only the bounding box would leave the stroke behind.
 */
const translated = (shape: Shape, dx: number, dy: number): Partial<Shape> => ({
  x: shape.x + dx,
  y: shape.y + dy,
  ...(shape.points
    ? { points: shape.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) }
    : {}),
})

/** Resizes about the corner opposite the grip, scaling any path to match. */
const resized = (shape: Shape, handle: ResizeHandle, world: Point): Partial<Shape> => {
  const left = handle === 'nw' || handle === 'sw'
  const top = handle === 'nw' || handle === 'ne'

  const anchorX = left ? shape.x + shape.width : shape.x
  const anchorY = top ? shape.y + shape.height : shape.y

  const x = Math.min(anchorX, world.x)
  const y = Math.min(anchorY, world.y)
  const width = Math.max(MIN_SIZE, Math.abs(world.x - anchorX))
  const height = Math.max(MIN_SIZE, Math.abs(world.y - anchorY))

  if (!shape.points) return { x, y, width, height }

  // Map each point through the same box transform so the stroke keeps its shape.
  const scaleX = width / Math.max(shape.width, 1)
  const scaleY = height / Math.max(shape.height, 1)
  return {
    x,
    y,
    width,
    height,
    points: shape.points.map((point) => ({
      x: x + (point.x - shape.x) * scaleX,
      y: y + (point.y - shape.y) * scaleY,
    })),
  }
}

export const useInfiniteCanvas = () => {
  const dispatch = useAppDispatch()
  const state = useAppSelector((s: RootState) => s.shapes)
  const { viewport, tool, selectedId } = state
  const shapes = selectors.selectAll(state.entities)

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const onWheelRef = useRef<(event: WheelEvent) => void>(() => {})
  const gesture = useRef<
    | { kind: 'pan' | 'draw'; origin: Point }
    | { kind: 'move'; origin: Point; shape: Shape }
    | { kind: 'resize'; origin: Point; shape: Shape; handle: ResizeHandle }
    | null
  >(null)
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

  /**
   * Grab a shape. Called from the shape, which stops the event before it
   * reaches the canvas — otherwise the canvas's own handler would clear the
   * selection the moment it was made.
   */
  const beginMove = (shape: Shape, event: React.PointerEvent<Element>) => {
    event.stopPropagation()
    if (tool === 'eraser') {
      dispatch(removeShape(shape.id))
      return
    }
    if (tool !== 'select') return

    event.currentTarget.setPointerCapture?.(event.pointerId)
    dispatch(selectShape(shape.id))
    dispatch(snapshotHistory())
    gesture.current = { kind: 'move', origin: screenToWorld(localPoint(event)), shape }
  }

  const beginResize = (
    shape: Shape,
    handle: ResizeHandle,
    event: React.PointerEvent<Element>,
  ) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dispatch(selectShape(shape.id))
    dispatch(snapshotHistory())
    gesture.current = { kind: 'resize', origin: screenToWorld(localPoint(event)), shape, handle }
  }

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

    if (active.kind === 'move') {
      const world = screenToWorld(point)
      const changes = translated(
        active.shape,
        world.x - active.origin.x,
        world.y - active.origin.y,
      )
      dispatch(updateShapeLive({ id: active.shape.id, changes }))
      return
    }

    if (active.kind === 'resize') {
      const world = screenToWorld(point)
      dispatch(
        updateShapeLive({
          id: active.shape.id,
          changes: resized(active.shape, active.handle, world),
        }),
      )
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
    beginMove,
    beginResize,
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
