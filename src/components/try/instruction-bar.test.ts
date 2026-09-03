import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Shape } from '@/redux/slice/shapes'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { InstructionBar } = await import('./instruction-bar')
const { default: reducer, addShape, selectShape, undo } = await import('@/redux/slice/shapes')

const frame = (id: string, instruction: string): Shape => ({
  id,
  kind: 'frame',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  fill: '#ffffff',
  instruction,
})

const makeStore = () => {
  const store = configureStore({ reducer: { shapes: reducer } })
  store.dispatch(addShape(frame('f', 'old')))
  store.dispatch(addShape(frame('g', 'other')))
  store.dispatch(selectShape('f'))
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
    root!.render(createElement(Provider, { store, children: createElement(InstructionBar) }))
  })
  return host.querySelector<HTMLInputElement>('#try-instruction')!
}

const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!

const focus = (input: HTMLInputElement) => {
  act(() => {
    input.focus()
  })
}

/** What a keyboard does: the value changes and an input event follows. */
const type = (input: HTMLInputElement, text: string) => {
  act(() => {
    setValue.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const blur = (input: HTMLInputElement) => {
  act(() => {
    input.blur()
  })
}

const press = (input: HTMLInputElement, key: string) => {
  act(() => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

const instruction = (store: Store, id: string) =>
  store.getState().shapes.entities.entities[id]?.instruction

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
})

/**
 * Typing threw React error 185 and dropped a letter per throw: every
 * keystroke went through the store, and the autosave effect answered each
 * render with a state update from inside the same commit. The words stay in
 * the field now and reach the store when the field is left.
 */
describe('the instruction bar', () => {
  it('keeps a keystroke out of the store', () => {
    const store = makeStore()
    const input = mount(store)
    focus(input)
    type(input, 'a pricing page')
    expect(input.value).toBe('a pricing page')
    expect(instruction(store, 'f')).toBe('old')
  })

  it('commits the sentence when the field is left, as one undo step', () => {
    const store = makeStore()
    const input = mount(store)
    focus(input)
    type(input, 'a pricing')
    type(input, 'a pricing page')
    blur(input)
    expect(instruction(store, 'f')).toBe('a pricing page')
    act(() => {
      store.dispatch(undo())
    })
    expect(instruction(store, 'f')).toBe('old')
  })

  it('commits on Enter', () => {
    const store = makeStore()
    const input = mount(store)
    focus(input)
    type(input, 'done')
    press(input, 'Enter')
    expect(instruction(store, 'f')).toBe('done')
  })

  /** A focus and blur without typing must not read as an edit. */
  it('leaves the table alone when nothing was typed', () => {
    const store = makeStore()
    const input = mount(store)
    const before = store.getState().shapes.entities
    focus(input)
    blur(input)
    expect(store.getState().shapes.entities).toBe(before)
  })

  /**
   * Clicking another frame moves the selection before the field blurs, so a
   * draft committed to "the selected frame" would land on the wrong one.
   */
  it('writes the draft to the frame it was typed for, not the one selected since', () => {
    const store = makeStore()
    const input = mount(store)
    focus(input)
    type(input, 'for f')
    act(() => {
      store.dispatch(selectShape('g'))
    })
    expect(input.value).toBe('other')
    blur(input)
    expect(instruction(store, 'f')).toBe('for f')
    expect(instruction(store, 'g')).toBe('other')
  })
})
