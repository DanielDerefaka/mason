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
  /** Not drawn either — placed from a file the user picked. */
  | 'image'
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
  /** Stored file URL, for `image` shapes only. */
  src?: string
  /** The frame this design was generated from. */
  sourceFrameId?: string
  /**
   * What the person said the frame is, in words. Set on a frame in /try and
   * copied onto the design it produced, so Explore can show the sketch, the
   * sentence and the result together.
   */
  instruction?: string
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
  /**
   * The selection, in no particular order. An array rather than a single id
   * because align, distribute, group and "move these two together" are all
   * downstream of being able to hold more than one.
   */
  selectedIds: string[]
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
  selectedIds: [],
  editingId: null,
  frameDialogOpen: false,
  past: [],
  future: [],
}

const HISTORY_LIMIT = 50

const serialise = (value: EntityState) => JSON.stringify(value)

const clone = (value: EntityState): EntityState => JSON.parse(serialise(value)) as EntityState

/**
 * Snapshot before a mutating action so undo has somewhere to go back to.
 *
 * Nothing is pushed when the table has not changed since the last snapshot.
 * A grab snapshots before it knows whether the pointer will move, so a plain
 * click on a shape used to push a copy of the present: fifty clicks around a
 * canvas evicted fifty real steps from a fifty-deep history, and the first
 * Cmd+Z after any click visibly did nothing.
 */
const commit = (state: ShapesState) => {
  state.future = []
  const top = state.past[state.past.length - 1]
  if (top && serialise(top) === serialise(state.entities)) return
  state.past.push(clone(state.entities))
  if (state.past.length > HISTORY_LIMIT) state.past.shift()
}

/** Whether a design is still being written onto the canvas by the model. */
const isStreaming = (state: ShapesState) =>
  Object.values(state.entities.entities).some((shape) => shape?.streaming === true)

/**
 * A shape as it can exist outside a live tab. `streaming` is true only while
 * this tab holds the model's response open, so on anything read back from
 * storage it is a stream a closed tab left behind, and a stale flag would
 * keep undo refused for good.
 */
const settled = (shape: Shape): Shape =>
  shape.streaming ? { ...shape, streaming: false } : shape

/**
 * What a project's stored `sketchesData` holds, read with suspicion: the
 * field is `v.any()` on the server, rows from before the viewport was saved
 * have none, and a version row holds whatever was written at the time.
 */
export const readSketches = (data: unknown): { shapes: Shape[]; viewport: Viewport | null } => {
  const stored = (data ?? {}) as { shapes?: unknown; viewport?: Partial<Viewport> }
  const shapes = Array.isArray(stored.shapes) ? (stored.shapes as Shape[]) : []
  const viewport =
    stored.viewport &&
    typeof stored.viewport.scale === 'number' &&
    typeof stored.viewport.translate?.x === 'number' &&
    typeof stored.viewport.translate?.y === 'number'
      ? (stored.viewport as Viewport)
      : null
  return { shapes, viewport }
}

export const shapesSlice = createSlice({
  name: 'shapes',
  initialState,
  reducers: {
    addShape: (state, action: PayloadAction<Shape>) => {
      commit(state)
      shapesAdapter.addOne(state.entities, action.payload)
      state.selectedIds = [action.payload.id]
    },
    updateShape: (state, action: PayloadAction<{ id: string; changes: Partial<Shape> }>) => {
      commit(state)
      shapesAdapter.updateOne(state.entities, action.payload)
    },
    removeShape: (state, action: PayloadAction<string>) => {
      commit(state)
      shapesAdapter.removeOne(state.entities, action.payload)
      state.selectedIds = state.selectedIds.filter((id) => id !== action.payload)
    },
    /** The AI's design, dropped next to the frame it came from. */
    addGeneratedUI: (state, action: PayloadAction<Shape>) => {
      commit(state)
      shapesAdapter.addOne(state.entities, action.payload)
    },

    /**
     * Take the panel back off, as if it had never been placed.
     *
     * The panel goes down before the request is sent, so a refusal has to
     * remove it again — and `removeShape` was doing that, which left two
     * entries in history for a generation that produced nothing: one from
     * `addGeneratedUI` and one from the removal. Undo after a failed
     * generation restored the empty placeholder, streaming clock and all,
     * and a second undo was needed to get back to the canvas the person
     * actually drew.
     *
     * So this commits nothing, and drops the snapshot the add pushed when
     * that snapshot has become a copy of the present. The pair leaves the
     * history exactly as it stood before Generate was pressed.
     */
    discardGeneratedUI: (state, action: PayloadAction<string>) => {
      shapesAdapter.removeOne(state.entities, action.payload)
      state.selectedIds = state.selectedIds.filter((id) => id !== action.payload)
      const top = state.past[state.past.length - 1]
      if (top && serialise(top) === serialise(state.entities)) state.past.pop()
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

    /**
     * The table as a project stores it: hydration, and nothing else.
     *
     * History starts empty here. The store lives in the /try layout and
     * outlives the canvas, so it kept the undo stack of whatever came before:
     * back from the editor, Cmd+Z put the pre-edit design on the canvas, and
     * on a switch between sketches it put the *other sketch* there.
     */
    setShapes: (state, action: PayloadAction<Shape[]>) => {
      shapesAdapter.setAll(state.entities, action.payload.map(settled))
      state.past = []
      state.future = []
      state.selectedIds = []
      state.editingId = null
    },
    /**
     * A saved version, put back as one undoable step. The panel used to reload
     * the page for this, which threw away the viewport and the undo stack with
     * it, so a restore that turned out to be the wrong one could not be undone.
     */
    restoreShapes: (state, action: PayloadAction<Shape[]>) => {
      commit(state)
      shapesAdapter.setAll(state.entities, action.payload.map(settled))
      state.selectedIds = []
      state.editingId = null
    },
    selectShape: (state, action: PayloadAction<string | null>) => {
      state.selectedIds = action.payload === null ? [] : [action.payload]
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

    /**
     * Both directions wait for a stream to finish. Cmd+Z while a design was
     * still arriving deleted it: `addGeneratedUI` snapshots the canvas from
     * before the panel existed, so undo removed the panel and every chunk
     * after that updated an id that was no longer there. The stream cannot be
     * rewound, so history stands still until it is over.
     *
     * A snapshot identical to the present is stepped over rather than
     * restored: a grab snapshots before it knows whether the pointer will
     * move, and restoring the copy a click left would be an undo that did
     * nothing.
     */
    undo: (state) => {
      if (isStreaming(state)) return
      const present = serialise(state.entities)
      let previous = state.past.pop()
      while (previous && serialise(previous) === present) previous = state.past.pop()
      if (!previous) return
      state.future.push(clone(state.entities))
      // Cloned rather than assigned directly: `previous` is a draft belonging
      // to this same state tree, and moving a draft into another branch of the
      // tree leaves Immer aliasing the old value instead of replacing it.
      state.entities = clone(previous)
      state.selectedIds = []
    },

    redo: (state) => {
      if (isStreaming(state)) return
      const present = serialise(state.entities)
      let next = state.future.pop()
      while (next && serialise(next) === present) next = state.future.pop()
      if (!next) return
      state.past.push(clone(state.entities))
      state.entities = clone(next)
      state.selectedIds = []
    },

    /** Shift-click: add to or remove from the selection. */
    toggleSelected: (state, action: PayloadAction<string>) => {
      state.selectedIds = state.selectedIds.includes(action.payload)
        ? state.selectedIds.filter((id) => id !== action.payload)
        : [...state.selectedIds, action.payload]
    },
    /** Marquee result, and select-all. */
    setSelection: (state, action: PayloadAction<string[]>) => {
      state.selectedIds = action.payload
    },
    removeSelected: (state) => {
      if (state.selectedIds.length === 0) return
      commit(state)
      shapesAdapter.removeMany(state.entities, state.selectedIds)
      state.selectedIds = []
    },
    /** Moves the whole selection by a world-space delta. */
    moveSelected: (
      state,
      action: PayloadAction<{ dx: number; dy: number; commit?: boolean }>,
    ) => {
      if (action.payload.commit) commit(state)
      for (const id of state.selectedIds) {
        const shape = state.entities.entities[id]
        if (!shape) continue
        shape.x += action.payload.dx
        shape.y += action.payload.dy
        if (shape.points) {
          shape.points = shape.points.map((point) => ({
            x: point.x + action.payload.dx,
            y: point.y + action.payload.dy,
          }))
        }
      }
    },
    /**
     * Z-order.
     *
     * Paint order is the adapter's `ids` array, so reordering it is the whole
     * implementation — there is no separate z index to keep in sync.
     */
    reorderSelected: (
      state,
      action: PayloadAction<'front' | 'back' | 'forward' | 'backward'>,
    ) => {
      const ids = state.entities.ids as string[]
      const selected = new Set(state.selectedIds)
      if (selected.size === 0) return
      commit(state)

      const picked = ids.filter((id) => selected.has(id))
      const rest = ids.filter((id) => !selected.has(id))

      if (action.payload === 'front') {
        state.entities.ids = [...rest, ...picked]
        return
      }
      if (action.payload === 'back') {
        state.entities.ids = [...picked, ...rest]
        return
      }

      // One step. Walk from the end for 'forward' so a contiguous run of
      // selected shapes moves as a block instead of piling onto each other.
      const next = [...ids]
      const step = action.payload === 'forward' ? 1 : -1
      const order = action.payload === 'forward' ? [...next.keys()].reverse() : [...next.keys()]
      for (const index of order) {
        const id = next[index]
        if (!selected.has(id)) continue
        const target = index + step
        if (target < 0 || target >= next.length) continue
        if (selected.has(next[target])) continue
        ;[next[index], next[target]] = [next[target], next[index]]
      }
      state.entities.ids = next
    },
    /** Aligns every selected shape against the selection's bounding box. */
    alignSelected: (
      state,
      action: PayloadAction<'left' | 'centre-x' | 'right' | 'top' | 'centre-y' | 'bottom'>,
    ) => {
      const shapes = state.selectedIds
        .map((id) => state.entities.entities[id])
        .filter((shape): shape is Shape => Boolean(shape))
      if (shapes.length < 2) return
      commit(state)

      const minX = Math.min(...shapes.map((s) => s.x))
      const maxX = Math.max(...shapes.map((s) => s.x + s.width))
      const minY = Math.min(...shapes.map((s) => s.y))
      const maxY = Math.max(...shapes.map((s) => s.y + s.height))

      for (const shape of shapes) {
        const before = { x: shape.x, y: shape.y }
        switch (action.payload) {
          case 'left':
            shape.x = minX
            break
          case 'right':
            shape.x = maxX - shape.width
            break
          case 'centre-x':
            shape.x = (minX + maxX) / 2 - shape.width / 2
            break
          case 'top':
            shape.y = minY
            break
          case 'bottom':
            shape.y = maxY - shape.height
            break
          case 'centre-y':
            shape.y = (minY + maxY) / 2 - shape.height / 2
            break
        }
        if (shape.points) {
          const dx = shape.x - before.x
          const dy = shape.y - before.y
          shape.points = shape.points.map((point) => ({ x: point.x + dx, y: point.y + dy }))
        }
      }
    },
    /** Evens the gaps between three or more shapes along one axis. */
    distributeSelected: (state, action: PayloadAction<'x' | 'y'>) => {
      const shapes = state.selectedIds
        .map((id) => state.entities.entities[id])
        .filter((shape): shape is Shape => Boolean(shape))
      if (shapes.length < 3) return
      commit(state)

      const horizontal = action.payload === 'x'
      const size = (s: Shape) => (horizontal ? s.width : s.height)
      const pos = (s: Shape) => (horizontal ? s.x : s.y)

      const ordered = [...shapes].sort((a, b) => pos(a) - pos(b))
      const first = ordered[0]
      const last = ordered[ordered.length - 1]
      const span = pos(last) + size(last) - pos(first)
      const used = ordered.reduce((total, shape) => total + size(shape), 0)
      // The leftovers, spread evenly between them. Negative means they
      // overlap, which is still the even answer.
      const gap = (span - used) / (ordered.length - 1)

      let cursor = pos(first)
      for (const shape of ordered) {
        const before = { x: shape.x, y: shape.y }
        if (horizontal) shape.x = cursor
        else shape.y = cursor
        cursor += size(shape) + gap

        if (shape.points) {
          const dx = shape.x - before.x
          const dy = shape.y - before.y
          shape.points = shape.points.map((point) => ({ x: point.x + dx, y: point.y + dy }))
        }
      }
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
      if (state.selectedIds.length === 0) return
      commit(state)
      for (const id of state.selectedIds) {
        const shape = state.entities.entities[id]
        if (!shape) continue
        shape.x += action.payload.dx
        shape.y += action.payload.dy
        // Freehand and arrows carry their own path, which has to move too.
        if (shape.points) {
          shape.points = shape.points.map((point) => ({
            x: point.x + action.payload.dx,
            y: point.y + action.payload.dy,
          }))
        }
      }
    },
    /**
     * Copies the selection, offset so the new shape is visibly on top of the
     * old one rather than hidden exactly behind it.
     */
    duplicateSelected: (state, action: PayloadAction<{ ids: string[]; offset: number }>) => {
      const sources = state.selectedIds
        .map((id) => state.entities.entities[id])
        .filter((shape): shape is Shape => Boolean(shape))
      if (sources.length === 0) return
      commit(state)

      const copies = sources.map((source, index) => {
        const copy: Shape = {
          ...(JSON.parse(JSON.stringify(source)) as Shape),
          id: action.payload.ids[index],
          x: source.x + action.payload.offset,
          y: source.y + action.payload.offset,
        }
        if (copy.points) {
          copy.points = copy.points.map((point) => ({
            x: point.x + action.payload.offset,
            y: point.y + action.payload.offset,
          }))
        }
        return copy
      })

      shapesAdapter.addMany(state.entities, copies)
      state.selectedIds = copies.map((copy) => copy.id)
    },
    resetViewport: (state) => {
      state.viewport = { scale: 1, translate: { x: 0, y: 0 } }
    },
    /**
     * Puts a frame round an image that landed on bare canvas, and selects it.
     *
     * A photo of a paper sketch is the whole reason a picture gets placed
     * here, and a placed picture used to sit on the canvas with nothing to
     * press: Generate is a frame's button, the instruction bar wants a frame
     * selected, and the hint had gone the moment the image arrived. So the
     * frame is made for them, the size of the picture plus a margin to grab
     * it by, and selected so the bar and the pills appear at once.
     *
     * A frame holds whatever touches it (`frameContents` in the manifest),
     * so an image dropped onto an existing frame is already inside one and is
     * left alone. The new frame goes *behind* the image in paint order: a
     * frame drawn over a picture would take every click meant for it.
     */
    wrapImageInFrame: (
      state,
      action: PayloadAction<{ id: string; frameId: string; margin: number }>,
    ) => {
      const image = state.entities.entities[action.payload.id]
      if (!image || image.kind !== 'image') return

      const ids = state.entities.ids as string[]
      const held = ids.some((id) => {
        const frame = state.entities.entities[id]
        return (
          frame?.kind === 'frame' &&
          image.x < frame.x + frame.width &&
          image.x + image.width > frame.x &&
          image.y < frame.y + frame.height &&
          image.y + image.height > frame.y
        )
      })
      if (held) return

      commit(state)
      const margin = Math.max(0, action.payload.margin)
      const frame: Shape = {
        id: action.payload.frameId,
        kind: 'frame',
        x: image.x - margin,
        y: image.y - margin,
        width: image.width + margin * 2,
        height: image.height + margin * 2,
        fill: 'transparent',
        // "Frame", as a drawn one is named: the file's name is not a
        // description of the screen, and the route drops a bare "Frame"
        // before the prompt is built.
        label: 'Frame',
      }
      shapesAdapter.addOne(state.entities, frame)
      const without = (state.entities.ids as string[]).filter((id) => id !== frame.id)
      without.splice(without.indexOf(image.id), 0, frame.id)
      state.entities.ids = without

      state.selectedIds = [frame.id]
      // Whatever tool placed the picture, the next thing to do is press
      // Generate or type an instruction, and both want the frame selectable.
      state.tool = 'select'
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
  discardGeneratedUI,
  setGeneratedHtml,
  resizeGeneratedUI,
  updateShape,
  removeShape,
  setShapes,
  restoreShapes,
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
  toggleSelected,
  setSelection,
  removeSelected,
  moveSelected,
  reorderSelected,
  alignSelected,
  distributeSelected,
  duplicateSelected,
  wrapImageInFrame,
} = shapesSlice.actions

export default shapesSlice.reducer
