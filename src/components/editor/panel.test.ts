import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Properties } from './properties'

// React wants to be told it is being driven by `act` rather than a browser.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// jsdom has no ResizeObserver, and the slider measures itself with one.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as never

/**
 * What the inspector actually renders.
 *
 * Written after the Appearance section was reported appearing forty-two times
 * down the panel. Nothing in the suite could have caught it: every test
 * covered the rules behind the controls and none covered the panel that
 * arranges them, so a section that multiplies looked, from a screenshot,
 * exactly like a broken dev server.
 *
 * Two kinds of check, because the bug needed both. The static renders below
 * fix what the panel is made of; the re-render test above fixes that it stays
 * that way, which is the half a single render cannot see.
 */
const panel = (
  html: string,
  overrides: Partial<Parameters<typeof Properties>[0]> = {},
): string => {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)

  return renderToStaticMarkup(
    createElement(Properties, {
      element: host.firstElementChild as HTMLElement,
      guide: null,
      locked: false,
      onStyle: () => {},
      onStyles: () => {},
      onText: () => {},
      onAttribute: () => {},
      onUpload: () => {},
      onReplace: () => {},
      onExport: () => {},
      onUnlock: () => {},
      component: null,
      componentIsSelection: false,
      instances: 0,
      onCreateComponent: () => {},
      onRenameComponent: () => {},
      onDetachComponent: () => {},
      onPushToInstances: () => {},
      onSelectComponentRoot: () => {},
      uploading: false,
      ...overrides,
    }),
  )
}

/** Everything the panel needs but the element and the callbacks. */
const PROPS = {
  guide: null,
  locked: false,
  onStyle: () => {},
  onStyles: () => {},
  onText: () => {},
  onAttribute: () => {},
  onUpload: () => {},
  onReplace: () => {},
  onExport: () => {},
  onUnlock: () => {},
  component: null,
  componentIsSelection: false,
  instances: 0,
  onCreateComponent: () => {},
  onRenameComponent: () => {},
  onDetachComponent: () => {},
  onPushToInstances: () => {},
  onSelectComponentRoot: () => {},
  uploading: false,
}

/** Section headings are their own text node, so this counts sections. */
const headings = (html: string, label: string) =>
  (html.match(new RegExp(`>${label}<`, 'g')) ?? []).length

const SECTIONS = [
  'Component',
  'Alignment',
  'Position',
  'Layout',
  'Dimensions',
  'Appearance',
  'Text',
  'Fill',
  'Stroke',
  'Effects',
  'Code',
  'Export',
]

describe('re-rendering', () => {
  /**
   * The regression this file was really written for.
   *
   * Two sections were keyed to the selected node's id, and both to the *same*
   * id. React matches keyed children through a map, so the duplicate lost its
   * match on every update and the section was re-inserted without the old one
   * being removed — one extra copy per re-render. It rendered correctly the
   * first time, which is why a static render could not see it, and the editor
   * re-renders on zoom, so it grew while the user was doing nothing but
   * looking around. Forty-two copies by the time it was reported.
   *
   * Rendered for real and updated, because a single render cannot fail this.
   */
  it('renders each section once however many times the panel updates', async () => {
    const host = document.createElement('div')
    host.innerHTML = '<section style="padding:24px"><h1>A heading</h1></section>'
    document.body.append(host)

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const element = createElement(Properties, {
      ...PROPS,
      element: host.firstElementChild as HTMLElement,
    })

    for (let pass = 0; pass < 4; pass += 1) {
      await act(async () => root.render(element))
    }

    const labels = Array.from(container.querySelectorAll('section > button')).map((button) =>
      button.textContent?.trim(),
    )

    expect(labels).toEqual(Array.from(new Set(labels)))
  })
})

describe('the inspector', () => {
  const html = panel('<section style="padding:24px;display:flex"><h1>A heading</h1></section>')

  it.each(SECTIONS)('renders %s exactly once', (label) => {
    expect(headings(html, label)).toBe(1)
  })

  it('leaves out the sections that would do nothing for the selection', () => {
    // Layout is only meaningful for something that arranges children, and the
    // image controls only for an image.
    const leaf = panel('<p style="color:red">Body copy</p>')

    expect(headings(leaf, 'Layout')).toBe(0)
    expect(headings(leaf, 'Image')).toBe(0)
    expect(headings(panel('<img alt="a" src="/x.png">'), 'Image')).toBe(1)
  })

  it('says the selection is locked, rather than silently ignoring the drags', () => {
    expect(panel('<section><h1>A</h1></section>', { locked: true })).toContain('Locked')
  })

  it('offers to make a component when there is not one, and to push when there is', () => {
    expect(html).toContain('Create component from this')

    const instance = panel('<section><h1>A</h1></section>', {
      component: 'Hero',
      componentIsSelection: true,
      instances: 3,
    })
    expect(instance).toContain('Push to 2 others')
    expect(instance).not.toContain('Create component from this')
  })

  it('warns when the edit will land on one instance only', () => {
    const inside = panel('<section><h1>A</h1></section>', {
      component: 'Hero',
      componentIsSelection: false,
      instances: 2,
    })

    expect(inside).toContain('only this instance')
  })
})
