import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Shape } from '@/redux/slice/shapes'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let projectId = 'p1'
let project: Record<string, unknown> | null | undefined
const save = vi.fn()

vi.mock('convex/react', () => ({
  useQuery: () => project,
  useMutation: () => save,
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(`project=${projectId}`),
}))

const { DEBOUNCE_MS, useAutosave } = await import('./use-autosave')
const {
  default: reducer,
  addGeneratedUI,
  selectShape,
  setGeneratedHtml,
  setViewport,
  snapshotHistory,
  updateShapeLive,
} = await import('@/redux/slice/shapes')

const frame = (patch: Partial<Shape> = {}): Shape => ({
  id: 'f',
  kind: 'frame',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  fill: '#ffffff',
  ...patch,
})

const design = (patch: Partial<Shape> = {}): Shape => ({
  ...frame({ id: 'd', kind: 'generated-ui', html: '', streaming: true }),
  ...patch,
})

const makeStore = () => configureStore({ reducer: { shapes: reducer } })
type Store = ReturnType<typeof makeStore>

const Probe = () => {
  const { status } = useAutosave()
  return createElement('output', null, status)
}

let root: Root | null = null
let host: HTMLDivElement

const mount = (store: Store) => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => {
    // eslint-disable-next-line react/no-children-prop
    root!.render(createElement(Provider, { store, children: createElement(Probe) }))
  })
}

const unmount = () => {
  if (!root) return
  const current = root
  root = null
  act(() => current.unmount())
}

const status = () => host.querySelector('output')?.textContent

/** Lets the debounce fire and the write's promise settle. */
const settle = async (ms = DEBOUNCE_MS + 1) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await Promise.resolve()
    await Promise.resolve()
  })
}

const dispatch = (store: Store, action: Parameters<Store['dispatch']>[0]) => {
  act(() => {
    store.dispatch(action)
  })
}

const written = (call: number) =>
  save.mock.calls[call][0] as {
    projectId: string
    sketchesData: { shapes: Shape[]; viewport: unknown }
    touch: boolean
  }

beforeEach(() => {
  vi.useFakeTimers()
  projectId = 'p1'
  project = {
    _id: 'p1',
    sketchesData: {
      shapes: [frame({ instruction: 'old' })],
      viewport: { scale: 1, translate: { x: 0, y: 0 } },
    },
  }
  save.mockReset()
  save.mockResolvedValue({ success: true })
  document.body.innerHTML = ''
})

afterEach(() => {
  unmount()
  vi.useRealTimers()
})

describe('autosave', () => {
  it('hydrates the stored sketch and reads as saved', () => {
    const store = makeStore()
    mount(store)
    expect(store.getState().shapes.entities.ids).toEqual(['f'])
    expect(status()).toBe('saved')
  })

  /**
   * Typing in the instruction bar threw React error 185 and lost a letter
   * per throw. Every keystroke reached the store, and the effect here
   * answered each with `setStatus('unsaved')` from inside the same commit.
   * The keystrokes now go through as one write, and none is dropped.
   */
  it('writes a burst of keystrokes once, after the canvas goes still', async () => {
    const store = makeStore()
    mount(store)
    let text = ''
    for (const letter of 'hello') {
      text += letter
      dispatch(store, updateShapeLive({ id: 'f', changes: { instruction: text } }))
      await settle(50)
    }
    expect(status()).toBe('unsaved')
    expect(save).not.toHaveBeenCalled()

    await settle()
    expect(save).toHaveBeenCalledTimes(1)
    expect(written(0).sketchesData.shapes[0].instruction).toBe('hello')
    expect(written(0).touch).toBe(true)
    expect(status()).toBe('saved')
  })

  /** Selecting a frame flipped the header to "Unsaved changes". */
  it('does not count a click as a change', async () => {
    const store = makeStore()
    mount(store)
    dispatch(store, selectShape('f'))
    dispatch(store, snapshotHistory())
    expect(status()).toBe('saved')
    await settle()
    expect(save).not.toHaveBeenCalled()
  })

  it('writes a pan without announcing it as an edit', async () => {
    const store = makeStore()
    mount(store)
    dispatch(store, setViewport({ scale: 2, translate: { x: 10, y: 10 } }))
    expect(status()).toBe('saved')
    await settle()
    expect(save).toHaveBeenCalledTimes(1)
    expect(written(0).touch).toBe(false)
  })

  /**
   * The cleanup cleared the debounce and dropped the write with it, so
   * leaving for the editor within 1.2 s of a change lost the change: the
   * canvas rehydrated from the server's older copy on the way back.
   */
  it('sends a pending write when the canvas is left', () => {
    const store = makeStore()
    mount(store)
    dispatch(store, updateShapeLive({ id: 'f', changes: { instruction: 'kept' } }))
    expect(save).not.toHaveBeenCalled()
    unmount()
    expect(save).toHaveBeenCalledTimes(1)
    expect(written(0).sketchesData.shapes[0].instruction).toBe('kept')
  })

  /**
   * Every chunk re-armed the timer, so any pause in the stream longer than
   * the debounce wrote a half-finished design and flipped the header between
   * "Saved" and "Unsaved changes" for the rest of it.
   */
  it('holds the status steady and writes nothing while a design streams', async () => {
    const store = makeStore()
    mount(store)
    dispatch(store, addGeneratedUI(design()))
    expect(status()).toBe('unsaved')

    for (const chunk of ['<p>', '<p>a', '<p>ab']) {
      dispatch(store, setGeneratedHtml({ id: 'd', html: chunk, streaming: true }))
      await settle()
      expect(status()).toBe('unsaved')
      expect(save).not.toHaveBeenCalled()
    }

    dispatch(store, setGeneratedHtml({ id: 'd', html: '<p>abc</p>', streaming: false }))
    await settle()
    expect(save).toHaveBeenCalledTimes(1)
    const design_ = written(0).sketchesData.shapes.find((shape) => shape.id === 'd')
    expect(design_?.html).toBe('<p>abc</p>')
    expect(design_?.streaming).toBe(false)
    expect(status()).toBe('saved')
  })

  /**
   * A switch between sketches used to drop the write for the one being left.
   * Now it goes to that sketch, under that sketch's id, before the next one
   * is loaded.
   */
  it('sends the old sketch to the old project before loading the new one', async () => {
    const store = makeStore()
    mount(store)
    dispatch(store, updateShapeLive({ id: 'f', changes: { instruction: 'for p1' } }))

    act(() => {
      projectId = 'p2'
      project = { _id: 'p2', sketchesData: { shapes: [frame({ id: 'g' })] } }
      // eslint-disable-next-line react/no-children-prop
      root!.render(createElement(Provider, { store, children: createElement(Probe) }))
    })

    expect(save).toHaveBeenCalledTimes(1)
    expect(written(0).projectId).toBe('p1')
    expect(written(0).sketchesData.shapes[0].instruction).toBe('for p1')
    expect(store.getState().shapes.entities.ids).toEqual(['g'])

    await settle()
    expect(save).toHaveBeenCalledTimes(1)
    expect(status()).toBe('saved')
  })
})

describe('what the store-watching effect is allowed to do', () => {
  const source = readFileSync(join(process.cwd(), 'src/hooks/use-autosave.ts'), 'utf8')
  const end = source.indexOf('[entities, viewport, streaming, projectId, flush])')
  const body = source.slice(source.lastIndexOf('useEffect(', end), end)

  it('exists in the shape this test expects', () => {
    expect(end).toBeGreaterThan(0)
  })

  /**
   * A state update scheduled from inside the commit that a keystroke caused
   * is what tripped React's nesting limit. The effect arms a timer and
   * nothing else; the serialising and the status changes wait for it.
   */
  it('schedules no state update and serialises nothing of its own', () => {
    expect(body).not.toContain('setStatus(')
    expect(body).not.toContain('setSaved(')
    expect(body).not.toContain('JSON.stringify(')
    expect(body).not.toContain('dispatch(')
  })
})
