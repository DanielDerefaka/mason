import { createEntityAdapter, createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { ShapeStyle, TextStyle } from '@/lib/text-style'

export type Point = { x: number; y: number }
export type ShapeKind =
  | 'rectangle'
  | 'ellipse'
  | 'frame'
  | 'text'
  | 'arrow'
  | 'pencil'
  | 'line'
  /** Not drawable — created by the AI and rendered from stored markup. */
  | 'generated-ui'
export type Tool = 'select' | 'hand' | 'eraser' | ShapeKind

export type Shape = {
  id: string
  kind: ShapeKind
  /** World coordinates — independent of pan and zoom. */
  x: number
  y: number
  width: number
  height: number
  fill: string
  label?: string
  /** World-space path for freehand and arrow shapes. */
  points?: Point[]
  /** Streamed markup, for `generated-ui` shapes only. */
  html?: string
  /** The frame this design was generated from. */
  sourceFrameId?: string
  /** True while the model is still streaming into `html`. */
  streaming?: boolean
  /**
   * Typography, for `text` shapes only. Partial so a shape carries only what
   * was actually changed; the rest comes from `DEFAULT_TEXT_STYLE`.
   */
  text?: Partial<TextStyle>
  /** Fill/stroke/shadow, for every kind except `text`. */
  style?: Partial<ShapeStyle>
}

export type Viewport = {
  scale: number
  translate: Point
}

export const MIN_SCALE = 0.1
export const MAX_SCALE = 5

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))

export const shapesAdapter = createEntityAdapter<Shape>()

type EntityState = ReturnType<typeof shapesAdapter.getInitialState>

type ShapesState = {
  entities: EntityState
  viewport: Viewport
  tool: Tool
  selectedId: string | null
  /** The text shape currently being typed into, if any. */
  editingId: string | null
  /**
   * Whether the frame-size picker is open. Lives here rather than in the
   * canvas because the button that opens it is in the navbar, which is a
   * separate tree — the store is the only thing they share.
   */
  frameDialogOpen: boolean
  /** Snapshots of the entity table, newest last. Viewport is not part of history. */
  past: EntityState[]
  future: EntityState[]
}

const initialState: ShapesState = {
  entities: shapesAdapter.getInitialState(),
  viewport: { scale: 1, translate: { x: 0, y: 0 } },
  tool: 'select',
  selectedId: null,
  editingId: null,
  frameDialogOpen: false,
  past: [],
  future: [],
}

const HISTORY_LIMIT = 50

const clone = (value: EntityState): EntityState =>
  JSON.parse(JSON.stringify(value)) as EntityState

/** Snapshot before a mutating action so undo has somewhere to go back to. */
const commit = (state: ShapesState) => {
  state.past.push(clone(state.entities))
  if (state.past.length > HISTORY_LIMIT) state.past.shift()
  state.future = []
}

export const shapesSlice = createSlice({
  name: 'shapes',
  initialState,
  reducers: {
    addShape: (state, action: PayloadAction<Shape>) => {
      commit(state)
      shapesAdapter.addOne(state.entities, action.payload)
      state.selectedId = action.payload.id
    },
    updateShape: (state, action: PayloadAction<{ id: string; changes: Partial<Shape> }>) => {
      commit(state)
      shapesAdapter.updateOne(state.entities, action.payload)
    },
    removeShape: (state, action: PayloadAction<string>) => {
      commit(state)
      shapesAdapter.removeOne(state.entities, action.payload)
      if (state.selectedId === action.payload) state.selectedId = null
    },
    /** The AI's design, dropped next to the frame it came from. */
    addGeneratedUI: (state, action: PayloadAction<Shape>) => {
      commit(state)
      shapesAdapter.addOne(state.entities, action.payload)
    },

    /**
     * Stream progress. Deliberately not committed to history: a generation
     * fires this every 200ms, and each snapshot would push out the user's real
     * undo steps within a couple of seconds.
     */
    setGeneratedHtml: (
      state,
      action: PayloadAction<{ id: string; html: string; streaming?: boolean }>,
    ) => {
      const { id, html, streaming } = action.payload
      shapesAdapter.updateOne(state.entities, { id, changes: { html, streaming } })
    },

    /** Height is measured from the rendered markup once it has laid out. */
    resizeGeneratedUI: (state, action: PayloadAction<{ id: string; height: number }>) => {
      const { id, height } = action.payload
      shapesAdapter.updateOne(state.entities, { id, changes: { height } })
    },

    /**
     * Snapshot the current shapes so a drag can be undone as one step. Taken
     * once when a gesture starts; the moves themselves must not commit, or a
     * single drag would fill the whole history.
     */
    snapshotHistory: (state) => {
      commit(state)
    },

    /** Mid-gesture update. Deliberately no history — see snapshotHistory. */
    /**
     * Merges into `text` rather than replacing it, so a control can send just
     * the property it owns. `commit` makes one change one undo step — sliders
     * use `updateTextStyleLive` while dragging and snapshot once on grab.
     */
    updateTextStyle: (state, action: PayloadAction<{ id: string; changes: Partial<TextStyle> }>) => {
      commit(state)
      const shape = state.entities.entities[action.payload.id]
      if (shape) shape.text = { ...shape.text, ...action.payload.changes }
    },
    /** The same merge without a history entry — for a slider mid-drag. */
    updateTextStyleLive: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<TextStyle> }>,
    ) => {
      const shape = state.entities.entities[action.payload.id]
      if (shape) shape.text = { ...shape.text, ...action.payload.changes }
    },
    /** The `style` equivalent of `updateTextStyle` — merges, and commits. */
    updateShapeStyle: (state, action: PayloadAction<{ id: string; changes: Partial<ShapeStyle> }>) => {
      commit(state)
      const shape = state.entities.entities[action.payload.id]
      if (shape) shape.style = { ...shape.style, ...action.payload.changes }
    },
    /** The same merge without a history entry — for a slider mid-drag. */
    updateShapeStyleLive: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<ShapeStyle> }>,
    ) => {
      const shape = state.entities.entities[action.payload.id]
      if (shape) shape.style = { ...shape.style, ...action.payload.changes }
    },
    updateShapeLive: (state, action: PayloadAction<{ id: string; changes: Partial<Shape> }>) => {
      shapesAdapter.updateOne(state.entities, action.payload)
    },

    setShapes: (state, action: PayloadAction<Shape[]>) => {
      shapesAdapter.setAll(state.entities, action.payload)
    },
    selectShape: (state, action: PayloadAction<string | null>) => {
      state.selectedId = action.payload
    },
    setTool: (state, action: PayloadAction<Tool>) => {
      state.tool = action.payload
      // Switching tools ends an edit; the caret would otherwise stay in a box
      // the user has visibly moved on from.
      state.editingId = null
    },

    setEditingId: (state, action: PayloadAction<string | null>) => {
      state.editingId = action.payload
    },

    /**
     * Zoom about a screen point. Solving for the translate that keeps the world
     * point under the cursor stationary is what makes zoom feel anchored rather
     * than sliding toward the origin.
     */
    setFrameDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.frameDialogOpen = action.payload
    },
    /**
     * Centres a world rectangle in the viewport and scales so it fits with a
     * margin. Used after adding a frame from a preset: a 1512-wide frame at
     * 100% is wider than the canvas, so dropping one in without this leaves
     * you looking at the inside of an edge.
     */
    focusOnRect: (
      state,
      action: PayloadAction<{
        x: number
        y: number
        width: number
        height: number
        viewWidth: number
        viewHeight: number
      }>,
    ) => {
      const { x, y, width, height, viewWidth, viewHeight } = action.payload
      if (viewWidth <= 0 || viewHeight <= 0) return

      const margin = 0.82
      const scale = clampScale(
        Math.min((viewWidth * margin) / width, (viewHeight * margin) / height),
      )
      state.viewport.scale = scale
      state.viewport.translate = {
        x: viewWidth / 2 - (x + width / 2) * scale,
        y: viewHeight / 2 - (y + height / 2) * scale,
      }
    },
    zoomWheel: (state, action: PayloadAction<{ deltaY: number; origin: Point }>) => {
      const { deltaY, origin } = action.payload
      const current = state.viewport.scale
      const next = clampScale(current * Math.exp(-deltaY * 0.0015))
      if (next === current) return

      const ratio = next / current
      state.viewport.translate.x = origin.x - (origin.x - state.viewport.translate.x) * ratio
      state.viewport.translate.y = origin.y - (origin.y - state.viewport.translate.y) * ratio
      state.viewport.scale = next
    },

    wheelPan: (state, action: PayloadAction<{ dx: number; dy: number }>) => {
      state.viewport.translate.x -= action.payload.dx
      state.viewport.translate.y -= action.payload.dy
    },

    panBy: (state, action: PayloadAction<{ dx: number; dy: number }>) => {
      state.viewport.translate.x += action.payload.dx
      state.viewport.translate.y += action.payload.dy
    },

    /** Zoom from the toolbar, anchored on the viewport centre rather than a cursor. */
    zoomTo: (state, action: PayloadAction<{ scale: number; center: Point }>) => {
      const current = state.viewport.scale
      const next = clampScale(action.payload.scale)
      if (next === current) return

      const { center } = action.payload
      const ratio = next / current
      state.viewport.translate.x = center.x - (center.x - state.viewport.translate.x) * ratio
      state.viewport.translate.y = center.y - (center.y - state.viewport.translate.y) * ratio
      state.viewport.scale = next
    },

    undo: (state) => {
      const previous = state.past.pop()
      if (!previous) return
      state.future.push(clone(state.entities))
      // Cloned rather than assigned directly: `previous` is a draft belonging
      // to this same state tree, and moving a draft into another branch of the
      // tree leaves Immer aliasing the old value instead of replacing it.
      state.entities = clone(previous)
      state.selectedId = null
    },

    redo: (state) => {
      const next = state.future.pop()
      if (!next) return
      state.past.push(clone(state.entities))
      state.entities = clone(next)
      state.selectedId = null
    },

    /** Restores a stored pan/zoom on load. */
    setViewport: (state, action: PayloadAction<Viewport>) => {
      state.viewport = {
        scale: clampScale(action.payload.scale),
        translate: action.payload.translate,
      }
    },
    /** Nudges the selection by whole world units — arrow keys. */
    nudgeSelected: (state, action: PayloadAction<{ dx: number; dy: number }>) => {
      if (!state.selectedId) return
      commit(state)
      const shape = state.entities.entities[state.selectedId]
      if (!shape) return
      shape.x += action.payload.dx
      shape.y += action.payload.dy
      // Freehand and arrows carry their own path, which has to move too.
      if (shape.points) {
        shape.points = shape.points.map((point) => ({
          x: point.x + action.payload.dx,
          y: point.y + action.payload.dy,
        }))
      }
    },
    /**
     * Copies the selection, offset so the new shape is visibly on top of the
     * old one rather than hidden exactly behind it.
     */
    duplicateSelected: (state, action: PayloadAction<{ id: string; offset: number }>) => {
      const source = state.entities.entities[state.selectedId ?? '']
      if (!source) return
      commit(state)
      const copy: Shape = {
        ...JSON.parse(JSON.stringify(source)),
        id: action.payload.id,
        x: source.x + action.payload.offset,
        y: source.y + action.payload.offset,
      }
      if (copy.points) {
        copy.points = copy.points.map((point) => ({
          x: point.x + action.payload.offset,
          y: point.y + action.payload.offset,
        }))
      }
      shapesAdapter.addOne(state.entities, copy)
      state.selectedId = copy.id
    },
    resetViewport: (state) => {
      state.viewport = { scale: 1, translate: { x: 0, y: 0 } }
    },
  },
})

export const {
  addShape,
  setEditingId,
  setFrameDialogOpen,
  focusOnRect,
  snapshotHistory,
  updateShapeLive,
  updateTextStyle,
  updateTextStyleLive,
  updateShapeStyle,
  updateShapeStyleLive,
  addGeneratedUI,
  setGeneratedHtml,
  resizeGeneratedUI,
  updateShape,
  removeShape,
  setShapes,
  selectShape,
  setTool,
  zoomWheel,
  wheelPan,
  panBy,
  zoomTo,
  undo,
  redo,
  resetViewport,
  setViewport,
  nudgeSelected,
  duplicateSelected,
} = shapesSlice.actions

export default shapesSlice.reducer
