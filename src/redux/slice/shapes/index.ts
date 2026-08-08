import { createEntityAdapter, createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type Point = { x: number; y: number }
export type ShapeKind = 'rectangle' | 'ellipse' | 'frame' | 'text'
export type Tool = 'select' | 'hand' | ShapeKind

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
}

export type Viewport = {
  scale: number
  translate: Point
}

export const MIN_SCALE = 0.1
export const MAX_SCALE = 5

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))

export const shapesAdapter = createEntityAdapter<Shape>()

type ShapesState = {
  entities: ReturnType<typeof shapesAdapter.getInitialState>
  viewport: Viewport
  tool: Tool
  selectedId: string | null
}

const initialState: ShapesState = {
  entities: shapesAdapter.getInitialState(),
  viewport: { scale: 1, translate: { x: 0, y: 0 } },
  tool: 'select',
  selectedId: null,
}

export const shapesSlice = createSlice({
  name: 'shapes',
  initialState,
  reducers: {
    addShape: (state, action: PayloadAction<Shape>) => {
      shapesAdapter.addOne(state.entities, action.payload)
      state.selectedId = action.payload.id
    },
    updateShape: (state, action: PayloadAction<{ id: string; changes: Partial<Shape> }>) => {
      shapesAdapter.updateOne(state.entities, action.payload)
    },
    removeShape: (state, action: PayloadAction<string>) => {
      shapesAdapter.removeOne(state.entities, action.payload)
      if (state.selectedId === action.payload) state.selectedId = null
    },
    setShapes: (state, action: PayloadAction<Shape[]>) => {
      shapesAdapter.setAll(state.entities, action.payload)
    },
    selectShape: (state, action: PayloadAction<string | null>) => {
      state.selectedId = action.payload
    },
    setTool: (state, action: PayloadAction<Tool>) => {
      state.tool = action.payload
    },

    /**
     * Zoom about a screen point. Solving for the translate that keeps the world
     * point under the cursor stationary is what makes zoom feel anchored rather
     * than sliding toward the origin.
     */
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

    resetViewport: (state) => {
      state.viewport = { scale: 1, translate: { x: 0, y: 0 } }
    },
  },
})

export const {
  addShape,
  updateShape,
  removeShape,
  setShapes,
  selectShape,
  setTool,
  zoomWheel,
  wheelPan,
  panBy,
  zoomTo,
  resetViewport,
} = shapesSlice.actions

export default shapesSlice.reducer
