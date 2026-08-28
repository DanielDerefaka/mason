import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import reducer, {
  MAX_SCALE,
  MIN_SCALE,
  type Shape,
  addShape,
  alignSelected,
  distributeSelected,
  duplicateSelected,
  moveSelected,
  nudgeSelected,
  panBy,
  redo,
  removeSelected,
  reorderSelected,
  setSelection,
  setViewport,
  shapesAdapter,
  shapesSlice,
  toggleSelected,
  undo,
  zoomTo,
  zoomWheel,
} from './index'

const shape = (id: string, patch: Partial<Shape> = {}): Shape => ({
  id,
  kind: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  fill: '#000000',
  ...patch,
})

const empty = () => reducer(undefined, { type: '@@init' })

/** Builds a state by replaying real actions, so the fixtures cannot drift. */
const withShapes = (...shapes: Shape[]) =>
  shapes.reduce((state, next) => reducer(state, addShape(next)), empty())
const at = (state: ReturnType<typeof empty>, id: string) => state.entities.entities[id]
const order = (state: ReturnType<typeof empty>) => state.entities.ids as string[]

describe('selection', () => {
  it('replaces the selection on a plain click', () => {
    let state = withShapes(shape('a'), shape('b'))
    state = reducer(state, setSelection(['a', 'b']))
    state = reducer(state, shapesSlice.actions.selectShape('a'))

    expect(state.selectedIds).toEqual(['a'])
  })

  it('clears on a click with nothing under it', () => {
    let state = withShapes(shape('a'))
    state = reducer(state, shapesSlice.actions.selectShape(null))

    expect(state.selectedIds).toEqual([])
  })

  it('adds and removes with toggle, so shift-click is reversible', () => {
    let state = withShapes(shape('a'), shape('b'))
    state = reducer(state, setSelection([]))
    state = reducer(state, toggleSelected('a'))
    state = reducer(state, toggleSelected('b'))
    expect(state.selectedIds).toEqual(['a', 'b'])

    state = reducer(state, toggleSelected('a'))
    expect(state.selectedIds).toEqual(['b'])
  })

  it('drops the selection when the shapes are deleted', () => {
    let state = withShapes(shape('a'), shape('b'))
    state = reducer(state, setSelection(['a', 'b']))
    state = reducer(state, removeSelected())

    expect(order(state)).toEqual([])
    expect(state.selectedIds).toEqual([])
  })
})

describe('history', () => {
  it('undoes and redoes a delete', () => {
    let state = withShapes(shape('a'), shape('b'))
    state = reducer(state, setSelection(['a']))
    state = reducer(state, removeSelected())
    expect(order(state)).toEqual(['b'])

    state = reducer(state, undo())
    expect(order(state)).toEqual(['a', 'b'])

    state = reducer(state, redo())
    expect(order(state)).toEqual(['b'])
  })

  it('does nothing at the ends instead of throwing', () => {
    const state = reducer(empty(), undo())
    expect(state.entities.ids).toEqual([])
    expect(reducer(state, redo()).entities.ids).toEqual([])
  })

  it('discards the redo stack once a new edit lands', () => {
    // Otherwise redo replays a branch the user has already left.
    let state = withShapes(shape('a'))
    state = reducer(state, removeSelected())
    state = reducer(state, undo())
    expect(state.future).toHaveLength(1)

    state = reducer(state, addShape(shape('c')))
    expect(state.future).toHaveLength(0)
  })

  it('keeps history independent of the state it was snapshotted from', () => {
    // The aliasing bug this guards: an Immer draft moved into another branch
    // of the same tree leaves undo returning the current value.
    let state = withShapes(shape('a', { x: 10 }))
    state = reducer(state, setSelection(['a']))
    state = reducer(state, nudgeSelected({ dx: 50, dy: 0 }))
    expect(at(state, 'a').x).toBe(60)

    state = reducer(state, undo())
    expect(at(state, 'a').x).toBe(10)
  })

  it('caps the stack so a long session cannot grow without bound', () => {
    let state = empty()
    for (let index = 0; index < 60; index += 1) {
      state = reducer(state, addShape(shape(`s${index}`)))
    }
    expect(state.past.length).toBeLessThanOrEqual(50)
  })

  it('does not record a drag until it is committed', () => {
    // Live drag frames each pushing a snapshot would make one drag take
    // dozens of undos to reverse.
    let state = withShapes(shape('a'))
    const before = state.past.length

    state = reducer(state, setSelection(['a']))
    state = reducer(state, moveSelected({ dx: 5, dy: 5 }))
    state = reducer(state, moveSelected({ dx: 5, dy: 5 }))
    expect(state.past.length).toBe(before)

    state = reducer(state, moveSelected({ dx: 5, dy: 5, commit: true }))
    expect(state.past.length).toBe(before + 1)
  })

  it('does not record panning, which is not an edit', () => {
    let state = withShapes(shape('a'))
    const before = state.past.length
    state = reducer(state, panBy({ dx: 100, dy: 100 }))

    expect(state.past.length).toBe(before)
  })
})

describe('z-order', () => {
  const three = () => {
    const state = withShapes(shape('a'), shape('b'), shape('c'))
    return reducer(state, setSelection(['b']))
  }

  it('sends to front and to back', () => {
    expect(order(reducer(three(), reorderSelected('front')))).toEqual(['a', 'c', 'b'])
    expect(order(reducer(three(), reorderSelected('back')))).toEqual(['b', 'a', 'c'])
  })

  it('steps one place at a time', () => {
    expect(order(reducer(three(), reorderSelected('forward')))).toEqual(['a', 'c', 'b'])
    expect(order(reducer(three(), reorderSelected('backward')))).toEqual(['b', 'a', 'c'])
  })

  it('stays put at the ends', () => {
    let state = withShapes(shape('a'), shape('b'))
    state = reducer(state, setSelection(['b']))
    expect(order(reducer(state, reorderSelected('forward')))).toEqual(['a', 'b'])
  })

  it('moves a contiguous run as a block rather than piling it up', () => {
    let state = withShapes(shape('a'), shape('b'), shape('c'), shape('d'))
    state = reducer(state, setSelection(['a', 'b']))
    state = reducer(state, reorderSelected('forward'))

    expect(order(state)).toEqual(['c', 'a', 'b', 'd'])
  })
})

describe('align', () => {
  const pair = () => {
    const state = withShapes(
      shape('a', { x: 0, y: 0, width: 100, height: 50 }),
      shape('b', { x: 200, y: 300, width: 40, height: 20 }),
    )
    return reducer(state, setSelection(['a', 'b']))
  }

  it('aligns left to the leftmost edge', () => {
    const state = reducer(pair(), alignSelected('left'))
    expect([at(state, 'a').x, at(state, 'b').x]).toEqual([0, 0])
  })

  it('aligns right to the rightmost edge, accounting for width', () => {
    const state = reducer(pair(), alignSelected('right'))
    expect([at(state, 'a').x, at(state, 'b').x]).toEqual([140, 200])
  })

  it('centres on the midpoint of the bounding box', () => {
    const state = reducer(pair(), alignSelected('centre-x'))
    expect(at(state, 'a').x + at(state, 'a').width / 2).toBe(120)
    expect(at(state, 'b').x + at(state, 'b').width / 2).toBe(120)
  })

  it('aligns top and bottom on the other axis', () => {
    expect(at(reducer(pair(), alignSelected('top')), 'b').y).toBe(0)
    expect(at(reducer(pair(), alignSelected('bottom')), 'a').y).toBe(270)
  })

  it('refuses on a single shape, which has nothing to align to', () => {
    let state = withShapes(shape('a', { x: 40 }))
    state = reducer(state, setSelection(['a']))
    const before = state.past.length

    state = reducer(state, alignSelected('left'))
    expect(at(state, 'a').x).toBe(40)
    expect(state.past.length).toBe(before)
  })

  it('carries a freehand path along with its shape', () => {
    let state = withShapes(
      shape('a', { x: 100, kind: 'pencil', points: [{ x: 100, y: 0 }] }),
      shape('b', { x: 0 }),
    )
    state = reducer(state, setSelection(['a', 'b']))
    state = reducer(state, alignSelected('left'))

    expect(at(state, 'a').points?.[0]).toEqual({ x: 0, y: 0 })
  })
})

describe('distribute', () => {
  it('spreads the gaps evenly and leaves the ends where they are', () => {
    let state = withShapes(
      shape('a', { x: 0, width: 100 }),
      shape('b', { x: 110, width: 100 }),
      shape('c', { x: 500, width: 100 }),
    )
    state = reducer(state, setSelection(['a', 'b', 'c']))
    state = reducer(state, distributeSelected('x'))

    expect(at(state, 'a').x).toBe(0)
    expect(at(state, 'c').x).toBe(500)
    // span 600, 300 used, 300 to share over two gaps.
    expect(at(state, 'b').x).toBe(250)
  })

  it('sorts by position rather than by selection order', () => {
    let state = withShapes(
      shape('a', { x: 400, width: 100 }),
      shape('b', { x: 0, width: 100 }),
      shape('c', { x: 200, width: 100 }),
    )
    state = reducer(state, setSelection(['a', 'b', 'c']))
    state = reducer(state, distributeSelected('x'))

    expect(at(state, 'b').x).toBe(0)
    expect(at(state, 'a').x).toBe(400)
  })

  it('refuses on two shapes, where there is no middle to move', () => {
    let state = withShapes(shape('a', { x: 0 }), shape('b', { x: 300 }))
    state = reducer(state, setSelection(['a', 'b']))
    state = reducer(state, distributeSelected('x'))

    expect(at(state, 'b').x).toBe(300)
  })
})

describe('duplicate', () => {
  it('offsets the copy and selects it, not the original', () => {
    let state = withShapes(shape('a', { x: 10, y: 20 }))
    state = reducer(state, setSelection(['a']))
    state = reducer(state, duplicateSelected({ ids: ['copy'], offset: 16 }))

    expect(at(state, 'copy')).toMatchObject({ x: 26, y: 36 })
    expect(state.selectedIds).toEqual(['copy'])
  })

  it('deep-copies the path so editing the copy cannot move the original', () => {
    let state = withShapes(shape('a', { kind: 'pencil', points: [{ x: 1, y: 1 }] }))
    state = reducer(state, setSelection(['a']))
    state = reducer(state, duplicateSelected({ ids: ['copy'], offset: 10 }))

    expect(at(state, 'copy').points).not.toBe(at(state, 'a').points)
  })
})

describe('viewport', () => {
  it('clamps zoom at both ends', () => {
    const inState = reducer(empty(), zoomTo({ scale: 99, center: { x: 0, y: 0 } }))
    expect(inState.viewport.scale).toBe(MAX_SCALE)

    const outState = reducer(empty(), zoomTo({ scale: 0.001, center: { x: 0, y: 0 } }))
    expect(outState.viewport.scale).toBe(MIN_SCALE)
  })

  it('holds the point under the cursor still while zooming', () => {
    // The property that makes trackpad zoom feel anchored rather than drifting.
    const origin = { x: 400, y: 300 }
    const state = reducer(empty(), zoomWheel({ deltaY: -100, origin }))

    const worldBefore = { x: (origin.x - 0) / 1, y: (origin.y - 0) / 1 }
    const worldAfter = {
      x: (origin.x - state.viewport.translate.x) / state.viewport.scale,
      y: (origin.y - state.viewport.translate.y) / state.viewport.scale,
    }

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 6)
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 6)
  })

  it('zooms in on a negative delta and out on a positive one', () => {
    const origin = { x: 0, y: 0 }
    expect(reducer(empty(), zoomWheel({ deltaY: -100, origin })).viewport.scale)
      .toBeGreaterThan(1)
    expect(reducer(empty(), zoomWheel({ deltaY: 100, origin })).viewport.scale)
      .toBeLessThan(1)
  })

  it('does not move the canvas when a zoom is already clamped', () => {
    let state = reducer(empty(), zoomTo({ scale: MAX_SCALE, center: { x: 0, y: 0 } }))
    state = reducer(state, panBy({ dx: 25, dy: 25 }))
    const translate = { ...state.viewport.translate }

    state = reducer(state, zoomWheel({ deltaY: -500, origin: { x: 300, y: 300 } }))
    expect(state.viewport.translate).toEqual(translate)
  })

  it('clamps a restored viewport, so a bad stored value cannot break the canvas', () => {
    const state = reducer(
      empty(),
      setViewport({ scale: 500, translate: { x: 10, y: 10 } }),
    )
    expect(state.viewport.scale).toBe(MAX_SCALE)
  })
})

describe('where the entity table actually lives', () => {
  /**
   * The regression this exists for: three places on /try read the slice as
   * though it were the entity table. `state.shapes.entities` is an *adapter
   * state* — `{ ids, entities }` — so `state.shapes.ids` is undefined and
   * `state.shapes.entities[id]` is undefined, always. One of the three took
   * the whole page down on mount, one left the instruction bar permanently
   * disabled, and one made remix-from-Explore fail every time. The names
   * collide, which is why it happened three times; this pins the shape so a
   * fourth is a failing test rather than an error boundary.
   */
  it('is one level inside the slice, not the slice itself', () => {
    const state = withShapes(shape('a'), shape('b'))
    const asRecord = state as unknown as Record<string, unknown>

    expect(asRecord.ids).toBeUndefined()
    expect(state.entities.ids).toEqual(['a', 'b'])

    const table = state.entities as unknown as Record<string, unknown>
    expect(table.a).toBeUndefined()
    expect(state.entities.entities.a?.id).toBe('a')
  })

  it('is what the adapter selectors want handed to them', () => {
    const state = withShapes(shape('a'))
    const selectors = shapesAdapter.getSelectors()

    expect(selectors.selectAll(state.entities).map((each) => each.id)).toEqual(['a'])
    expect(selectors.selectById(state.entities, 'a')?.id).toBe('a')
    // Handed the slice instead, `selectAll` reads an `ids` that is not there.
    expect(() =>
      selectors.selectAll(state as unknown as ReturnType<typeof shapesAdapter.getInitialState>),
    ).toThrow()
  })
})

describe('nothing reaches past the adapter state', () => {
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) return entry === 'node_modules' ? [] : sources(path)
      return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : []
    })

  /**
   * Comments are stripped first. Both mistakes below are now described in
   * prose in the files that used to make them, and a guard that fires on its
   * own explanation is a guard that gets deleted.
   */
  const code = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

  const files = sources(join(process.cwd(), 'src')).map((path) => ({
    path: path.slice(path.indexOf('src/')),
    source: code(readFileSync(path, 'utf8')),
  }))

  it('has files to check at all', () => {
    // Guards the guard: a moved directory would otherwise make the two
    // checks below pass by scanning nothing.
    expect(files.length).toBeGreaterThan(50)
  })

  it('never reads ids off the slice', () => {
    // The regression this exists for: `state.shapes.ids` is undefined, and
    // the `.length` after it threw during render — /try showed the error
    // boundary on mount for a week and no test or smoke check saw it,
    // because the crash is in the browser and the server had already
    // answered 200 with the Suspense fallback.
    const offenders = files.filter(({ source }) => /\.shapes\.ids\b/.test(source))
    expect(offenders.map((each) => each.path)).toEqual([])
  })

  it('never hands an adapter selector the whole slice', () => {
    // Same root cause, quieter symptom: `selectAll(state.shapes)` throws
    // inside a try/catch and the feature just never works. Remix from
    // Explore was dead this way from the day it was written.
    const offenders = files.filter(({ source }) =>
      /select(All|By[A-Za-z]*|Ids|Entities|Total)\(\s*[A-Za-z.()]*\.shapes\s*[,)]/.test(source),
    )
    expect(offenders.map((each) => each.path)).toEqual([])
  })
})
