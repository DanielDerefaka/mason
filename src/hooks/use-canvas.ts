'use client'

import { useCallback, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import {
  addShape,
  panBy,
  redo,
  removeShape,
  undo,
  alignSelected,
  distributeSelected,
  duplicateSelected,
  focusOnRect,
  moveSelected,
  nudgeSelected,
  removeSelected,
  reorderSelected,
  selectShape,
  setSelection,
  toggleSelected,
  setEditingId,
  setFrameDialogOpen,
  setTool,
  setViewport,
  shapesAdapter,
  snapshotHistory,
  updateShapeLive,
  wheelPan,
  zoomTo,
  zoomWheel,
  type Point,
  type Shape,
  type Viewport,
  type ShapeKind,
  type Tool,
} from '@/redux/slice/shapes'
import type { FramePreset } from '@/lib/frame-presets'
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

/** How close, in screen pixels, an edge has to be before it snaps. */
const SNAP_PX = 6

export type Guide = { axis: 'x' | 'y'; at: number }

/** Stops a shape being dragged inside out. */
const MIN_SIZE = 8

/** A text box placed with a click rather than dragged out. */
const TEXT_DEFAULT_WIDTH = 220
const TEXT_DEFAULT_HEIGHT = 32

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
  const { viewport, tool, selectedIds, editingId, frameDialogOpen } = state
  /**
   * The inspectors edit one shape at a time, so they key off a single id and
   * disappear when a selection becomes plural.
   */
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const shapes = selectors.selectAll(state.entities)

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const onWheelRef = useRef<(event: WheelEvent) => void>(() => {})
  const gesture = useRef<
    | { kind: 'pan' | 'draw'; origin: Point }
    | {
        kind: 'move'
        origin: Point
        shape: Shape
        /** How much of the pointer delta has already been dispatched. */
        applied: Point
        /** Selection bounds when the drag began, so snapping is drift-free. */
        start: { minX: number; minY: number; maxX: number; maxY: number }
      }
    | { kind: 'resize'; origin: Point; shape: Shape; handle: ResizeHandle }
    | { kind: 'marquee'; origin: Point }
    | null
  >(null)
  const [draft, setDraft] = useState<Shape | null>(null)
  /** The rubber band, in world coordinates. Null when not dragging one. */
  const [marquee, setMarquee] = useState<{ origin: Point; current: Point } | null>(null)
  const marqueeRef = useRef<{ origin: Point; current: Point } | null>(null)
  /**
   * The same draft, kept in a ref. State alone is not enough: a click fires
   * pointerdown and pointerup with no render in between, so the pointerup
   * handler would still close over `null` and create nothing.
   */
  const draftRef = useRef<Shape | null>(null)

  const putDraft = (next: Shape | null) => {
    draftRef.current = next
    setDraft(next)
  }

  const putMarquee = (next: { origin: Point; current: Point } | null) => {
    marqueeRef.current = next
    setMarquee(next)
  }

  const [guides, setGuides] = useState<Guide[]>([])
  const guidesRef = useRef<Guide[]>([])
  const putGuides = (next: Guide[]) => {
    // Same-value writes every frame would re-render the whole canvas at
    // pointer rate for nothing.
    const key = next.map((guide) => `${guide.axis}${guide.at}`).join('|')
    const previous = guidesRef.current.map((guide) => `${guide.axis}${guide.at}`).join('|')
    if (key === previous) return
    guidesRef.current = next
    setGuides(next)
  }

  /**
   * Pulls a proposed move onto the nearest edge or centre of a shape that is
   * not being dragged. Compares left/centre/right and top/middle/bottom, which
   * is what makes a card line up with the one above it rather than merely
   * landing near it.
   */
  const snapDelta = (
    raw: Point,
    start: { minX: number; minY: number; maxX: number; maxY: number },
  ): { delta: Point; guides: Guide[] } => {
    const threshold = SNAP_PX / viewport.scale
    const others = shapes.filter((shape) => !selectedIds.includes(shape.id))
    if (others.length === 0) return { delta: raw, guides: [] }

    const proposed = {
      minX: start.minX + raw.x,
      maxX: start.maxX + raw.x,
      minY: start.minY + raw.y,
      maxY: start.maxY + raw.y,
    }

    const targetsX = others.flatMap((shape) => [
      shape.x,
      shape.x + shape.width / 2,
      shape.x + shape.width,
    ])
    const targetsY = others.flatMap((shape) => [
      shape.y,
      shape.y + shape.height / 2,
      shape.y + shape.height,
    ])

    const nearest = (edges: number[], targets: number[]) => {
      let best: { at: number; shift: number } | null = null
      for (const edge of edges) {
        for (const target of targets) {
          const distance = target - edge
          if (Math.abs(distance) > threshold) continue
          if (!best || Math.abs(distance) < Math.abs(best.shift)) {
            best = { at: target, shift: distance }
          }
        }
      }
      return best
    }

    const x = nearest(
      [proposed.minX, (proposed.minX + proposed.maxX) / 2, proposed.maxX],
      targetsX,
    )
    const y = nearest(
      [proposed.minY, (proposed.minY + proposed.maxY) / 2, proposed.maxY],
      targetsY,
    )

    const lines: Guide[] = []
    if (x) lines.push({ axis: 'x', at: x.at })
    if (y) lines.push({ axis: 'y', at: y.at })

    return {
      delta: { x: raw.x + (x?.shift ?? 0), y: raw.y + (y?.shift ?? 0) },
      guides: lines,
    }
  }

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
    if (tool === 'eraser') {
      event.stopPropagation()
      dispatch(removeShape(shape.id))
      return
    }
    // Any drawing tool: let the event reach the canvas so a new shape starts
    // here. Swallowing it would make the area over an existing shape dead.
    if (tool !== 'select') return
    if (editingId === shape.id) return

    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)

    if (event.shiftKey) {
      // Shift-click adds or removes, and never starts a drag — otherwise the
      // click that extends a selection also nudges what it just added.
      dispatch(toggleSelected(shape.id))
      return
    }

    // Grabbing something already selected keeps the group; grabbing anything
    // else replaces the selection, the way every canvas tool behaves.
    if (!selectedIds.includes(shape.id)) dispatch(selectShape(shape.id))

    dispatch(snapshotHistory())

    // Everything about to move, measured once. Snapping compares against
    // these rather than live positions, so a snapped drag cannot drift.
    const moving = shapes.filter((candidate) =>
      selectedIds.includes(candidate.id) || candidate.id === shape.id,
    )
    gesture.current = {
      kind: 'move',
      origin: screenToWorld(localPoint(event)),
      shape,
      applied: { x: 0, y: 0 },
      start: {
        minX: Math.min(...moving.map((s) => s.x)),
        minY: Math.min(...moving.map((s) => s.y)),
        maxX: Math.max(...moving.map((s) => s.x + s.width)),
        maxY: Math.max(...moving.map((s) => s.y + s.height)),
      },
    }
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
      if (tool === 'select') {
        // Shift keeps what is already selected so a marquee can extend it.
        if (!event.shiftKey) dispatch(selectShape(null))
        gesture.current = { kind: 'marquee', origin: screenToWorld(point) }
        putMarquee({ origin: screenToWorld(point), current: screenToWorld(point) })
      }
      return
    }

    // The pan branch above can be taken while a shape tool is active (middle
    // click, shift-drag), so `tool` is not narrowed to a shape kind by control
    // flow alone.
    const kind: ShapeKind = tool
    const world = screenToWorld(point)
    gesture.current = { kind: 'draw', origin: world }
    putDraft({
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
      const raw = { x: world.x - active.origin.x, y: world.y - active.origin.y }
      const snapped = snapDelta(raw, active.start)

      // Dispatch only the part not already applied. Sending the raw per-frame
      // delta instead would accumulate the correction on every frame and walk
      // the selection away from the pointer.
      dispatch(
        moveSelected({
          dx: snapped.delta.x - active.applied.x,
          dy: snapped.delta.y - active.applied.y,
        }),
      )
      putGuides(snapped.guides)
      gesture.current = { ...active, applied: snapped.delta }
      return
    }

    if (active.kind === 'marquee') {
      putMarquee({ origin: active.origin, current: screenToWorld(point) })
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
    const current = draftRef.current
    if (!current) return
    {
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
        putDraft({
          ...current,
          points,
          x: minX,
          y: minY,
          width: Math.max(...xs) - minX,
          height: Math.max(...ys) - minY,
        })
        return
      }
      if (current.kind === 'arrow' || current.kind === 'line') {
        putDraft({ ...current, ...box, points: [active.origin, world] })
        return
      }
      putDraft({ ...current, ...box })
    }
  }

  const onPointerUp = () => {
    const active = gesture.current
    gesture.current = null
    putGuides([])

    if (active?.kind === 'marquee') {
      const band = marqueeRef.current
      putMarquee(null)
      if (band) {
        const box = {
          x: Math.min(band.origin.x, band.current.x),
          y: Math.min(band.origin.y, band.current.y),
          width: Math.abs(band.current.x - band.origin.x),
          height: Math.abs(band.current.y - band.origin.y),
        }
        // A click, not a drag — leave the deselect that already happened.
        if (box.width > 3 || box.height > 3) {
          // Touch, not enclose: catching a shape by clipping its corner is
          // what people expect from a rubber band on a canvas.
          const hit = shapes
            .filter(
              (shape) =>
                shape.x < box.x + box.width &&
                shape.x + shape.width > box.x &&
                shape.y < box.y + box.height &&
                shape.y + shape.height > box.y,
            )
            .map((shape) => shape.id)
          dispatch(setSelection([...new Set([...selectedIds, ...hit])]))
        }
      }
      return
    }

    const draft = draftRef.current
    if (active?.kind === 'draw' && draft) {
      // Ignore stray clicks that produce a zero-area shape — except for text,
      // where a single click is the normal way to place a box.
      const isPath = PATH_KINDS.includes(draft.kind)
      const isText = draft.kind === 'text'
      const meaningful = isPath
        ? (draft.points?.length ?? 0) > 1 && draft.width + draft.height > 4
        : isText || (draft.width > 4 && draft.height > 4)

      if (meaningful) {
        const id = crypto.randomUUID()
        dispatch(
          addShape({
            ...draft,
            id,
            ...(isText && draft.width < 20
              ? { width: TEXT_DEFAULT_WIDTH, height: TEXT_DEFAULT_HEIGHT }
              : {}),
            label: draft.kind === 'frame' ? 'Frame' : undefined,
          }),
        )
        // setTool clears any active edit, so switching back to select has to
        // happen before the caret is placed, not after.
        dispatch(setTool('select'))
        // Straight into the caret, so placing a text box and typing is one move.
        if (isText) dispatch(setEditingId(id))
      }
      putDraft(null)
    }
  }

  const viewportCenter = (): Point => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return { x: (rect?.width ?? 0) / 2, y: (rect?.height ?? 0) / 2 }
  }

  /**
   * Drops a preset-sized frame into the middle of the view and fits the
   * viewport to it. Placed in world coordinates so it lands where you are
   * looking rather than at the origin.
   */
  const addFrame = (preset: FramePreset) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const view = { width: rect?.width ?? 0, height: rect?.height ?? 0 }
    const centre = screenToWorld({ x: view.width / 2, y: view.height / 2 })

    const id = crypto.randomUUID()
    dispatch(
      addShape({
        id,
        kind: 'frame',
        x: Math.round(centre.x - preset.width / 2),
        y: Math.round(centre.y - preset.height / 2),
        width: preset.width,
        height: preset.height,
        fill: FILLS.frame,
        label: preset.name,
      }),
    )
    dispatch(
      focusOnRect({
        x: centre.x - preset.width / 2,
        y: centre.y - preset.height / 2,
        width: preset.width,
        height: preset.height,
        viewWidth: view.width,
        viewHeight: view.height,
      }),
    )
    dispatch(setTool('select'))
    dispatch(selectShape(id))
    dispatch(setFrameDialogOpen(false))
  }

  /** Fits every shape on screen. Nothing drawn yet means nothing to fit. */
  const zoomToFit = () => {
    if (shapes.length === 0) return
    const rect = canvasRef.current?.getBoundingClientRect()
    const viewWidth = rect?.width ?? 0
    const viewHeight = rect?.height ?? 0
    if (!viewWidth || !viewHeight) return

    const minX = Math.min(...shapes.map((shape) => shape.x))
    const minY = Math.min(...shapes.map((shape) => shape.y))
    const maxX = Math.max(...shapes.map((shape) => shape.x + shape.width))
    const maxY = Math.max(...shapes.map((shape) => shape.y + shape.height))

    dispatch(
      focusOnRect({
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        viewWidth,
        viewHeight,
      }),
    )
  }

  const eraseShape = (id: string) => dispatch(removeShape(id))
  const deleteSelected = () => dispatch(removeSelected())

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
    selectedIds,
    selectAll: () => dispatch(setSelection(shapes.map((shape) => shape.id))),
    marquee,
    guides,
    align: (edge: Parameters<typeof alignSelected>[0]) => dispatch(alignSelected(edge)),
    distribute: (axis: 'x' | 'y') => dispatch(distributeSelected(axis)),
    reorder: (where: Parameters<typeof reorderSelected>[0]) => dispatch(reorderSelected(where)),
    editingId,
    frameDialogOpen,
    openFrameDialog: () => dispatch(setFrameDialogOpen(true)),
    closeFrameDialog: () => dispatch(setFrameDialogOpen(false)),
    addFrame,
    beginEdit: (id: string) => {
      // One snapshot per editing session rather than per keystroke.
      dispatch(snapshotHistory())
      dispatch(selectShape(id))
      dispatch(setEditingId(id))
    },
    endEdit: () => dispatch(setEditingId(null)),
    setShapeText: (id: string, label: string, height?: number) =>
      dispatch(updateShapeLive({ id, changes: { label, ...(height ? { height } : {}) } })),
    beginMove,
    beginResize,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    zoomIn,
    zoomOut,
    zoomToScale,
    zoomToFit,
    restoreViewport: (next: Viewport) => dispatch(setViewport(next)),
    nudge: (dx: number, dy: number) => dispatch(nudgeSelected({ dx, dy })),
    duplicate: () => {
      if (selectedIds.length === 0) return
      dispatch(
        duplicateSelected({
          ids: selectedIds.map(() => crypto.randomUUID()),
          offset: 24,
        }),
      )
    },
    eraseShape,
    deleteSelected,
    undo: () => dispatch(undo()),
    redo: () => dispatch(redo()),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}
