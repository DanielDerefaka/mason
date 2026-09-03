import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createElement, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useDismiss } from './use-dismiss'

// React wants to be told it is being driven by `act` rather than a browser.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

/** A popover: whatever is inside the ref stays, anything else dismisses. */
const Popover = ({ open, onDismiss }: { open: boolean; onDismiss: () => void }) => {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(open, ref, onDismiss)
  return createElement('div', { ref }, createElement('button', { id: 'inside' }))
}

const mount = async (open: boolean) => {
  const onDismiss = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(createElement(Popover, { open, onDismiss })))
  return {
    onDismiss,
    inside: host.querySelector('#inside') as HTMLElement,
    unmount: () => act(async () => root.unmount()),
  }
}

const press = (target: EventTarget, type: string, init?: EventInit & { key?: string }) =>
  target.dispatchEvent(
    init?.key
      ? new KeyboardEvent(type, { bubbles: true, ...init })
      : new Event(type, { bubbles: true, ...init }),
  )

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * What shipped broken: the History and Share popovers closed through a
 * `fixed inset-0` catcher that swallowed the click that closed them, so with
 * either open, Preview and Ask AI each took two presses, and nobody knew the
 * first had gone anywhere. Closing on `pointerdown` at the document lets the
 * click carry on to whatever it was aimed at.
 */
describe('useDismiss', () => {
  it('dismisses on a press outside, and lets the press through', async () => {
    const { onDismiss, unmount } = await mount(true)

    const outside = document.createElement('button')
    document.body.append(outside)
    const reached = press(outside, 'pointerdown')

    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(reached).toBe(true)
    await unmount()
  })

  it('leaves a press inside alone', async () => {
    const { onDismiss, inside, unmount } = await mount(true)

    press(inside, 'pointerdown')

    expect(onDismiss).not.toHaveBeenCalled()
    await unmount()
  })

  it('dismisses on Escape', async () => {
    const { onDismiss, unmount } = await mount(true)

    press(document.body, 'keydown', { key: 'Escape' })
    press(document.body, 'keydown', { key: 'a' })

    expect(onDismiss).toHaveBeenCalledTimes(1)
    await unmount()
  })

  it('listens only while open', async () => {
    const { onDismiss, unmount } = await mount(false)

    press(document.body, 'pointerdown')
    press(document.body, 'keydown', { key: 'Escape' })

    expect(onDismiss).not.toHaveBeenCalled()
    await unmount()
  })
})

describe('the popovers', () => {
  for (const file of ['history.tsx', 'share.tsx']) {
    const source = read(`src/components/editor/${file}`)

    it(`${file} closes without a catcher in the way`, () => {
      expect(source).not.toContain('fixed inset-0')
      expect(source).toContain('useDismiss(open, popover')
    })
  }
})
