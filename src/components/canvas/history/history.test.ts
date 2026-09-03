import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { getFunctionName, type FunctionReference } from 'convex/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Shape } from '@/redux/slice/shapes'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Row = { _id: string; label: string; createdAt: number; origin: string }

let rows: Row[] | undefined
const restore = vi.fn()
const other = vi.fn()

vi.mock('convex/react', () => ({
  useQuery: () => rows,
  useMutation: (ref: FunctionReference<'mutation'>) =>
    getFunctionName(ref) === 'versions:restoreVersion' ? restore : other,
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('project=p1'),
}))

const { VersionHistory } = await import('./index')
const { default: reducer, addShape, undo } = await import('@/redux/slice/shapes')

const shape = (id: string): Shape => ({
  id,
  kind: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  fill: '#000000',
})

const makeStore = () => {
  const store = configureStore({ reducer: { shapes: reducer } })
  store.dispatch(addShape(shape('a')))
  return store
}
type Store = ReturnType<typeof makeStore>

let root: Root | null = null
let host: HTMLDivElement

const mount = (store: Store) => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => {
    // eslint-disable-next-line react/no-children-prop
    root!.render(createElement(Provider, { store, children: createElement(VersionHistory) }))
  })
}

const open = () => {
  const button = host.querySelector<HTMLButtonElement>('[aria-label="Version history"]')
  expect(button, 'the history control is in the navbar').not.toBeNull()
  act(() => {
    button!.click()
  })
}

const click = async (label: string) => {
  const button = host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
  expect(button, `a control labelled "${label}"`).not.toBeNull()
  await act(async () => {
    button!.click()
    await Promise.resolve()
  })
}

const ids = (store: Store) => store.getState().shapes.entities.ids

beforeEach(() => {
  rows = []
  restore.mockReset()
  restore.mockResolvedValue({
    success: true,
    data: { shapes: [shape('b')], viewport: { scale: 2, translate: { x: 5, y: 6 } } },
  })
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
})

describe('the version history panel', () => {
  /**
   * "No versions yet. Save one before a big change" was true and useless:
   * the panel had one entry to offer and asked for the foresight to make it.
   */
  it('says what it keeps rather than that it is empty', () => {
    mount(makeStore())
    open()
    expect(host.textContent).toContain('about once a minute')
  })

  it('dates an automatic copy instead of naming it', () => {
    rows = [{ _id: 'v1', label: 'Autosave', createdAt: Date.now() - 120_000, origin: 'auto' }]
    mount(makeStore())
    open()
    expect(host.textContent).toContain('2 minutes ago')
    expect(host.textContent).not.toContain('Autosave')
  })

  it('names a version somebody named', () => {
    rows = [{ _id: 'v2', label: 'Before lunch', createdAt: Date.now() - 3_600_000, origin: 'manual' }]
    mount(makeStore())
    open()
    expect(host.textContent).toContain('Before lunch')
    expect(host.textContent).toContain('1 hour ago')
  })

  /**
   * Restoring reloaded the page, which dropped the viewport and the undo
   * stack: a restore that turned out to be the wrong one was final. The
   * store takes the version now, pan and zoom included.
   */
  it('puts a restored version on the canvas without reloading the page', async () => {
    rows = [{ _id: 'v2', label: 'Before lunch', createdAt: Date.now() - 3_600_000, origin: 'manual' }]
    const store = makeStore()
    mount(store)
    open()
    await click('Restore Before lunch')

    expect(restore).toHaveBeenCalledWith({ versionId: 'v2' })
    expect(ids(store)).toEqual(['b'])
    expect(store.getState().shapes.viewport).toEqual({ scale: 2, translate: { x: 5, y: 6 } })
  })

  it('is one undo away from where the canvas was', async () => {
    rows = [{ _id: 'v2', label: 'Before lunch', createdAt: Date.now() - 3_600_000, origin: 'manual' }]
    const store = makeStore()
    mount(store)
    open()
    await click('Restore Before lunch')
    act(() => {
      store.dispatch(undo())
    })
    expect(ids(store)).toEqual(['a'])
  })
})

describe('what the panel no longer does', () => {
  const source = readFileSync(join(process.cwd(), 'src/components/canvas/history/index.tsx'), 'utf8')

  it('does not reload the page to show a restore', () => {
    expect(source).not.toContain('location.reload')
  })
})
