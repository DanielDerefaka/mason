import { describe, expect, it } from 'vitest'

import {
  HIDDEN_ATTR,
  NODE_ATTR,
  ancestorIds,
  assignNodeIds,
  buildLayerRows,
  defaultExpanded,
  dropLayer,
  isHidden,
  isLocked,
  labelFor,
  lockedAncestor,
  renameNode,
  setHidden,
  setLocked,
} from './node'

/**
 * The layer tree.
 *
 * Everything it shows is read back out of the DOM, and everything it records —
 * a name, a hidden layer, a locked one — is written onto the node so it
 * survives a save. These are the rules behind both halves of that.
 */
const mount = (html: string) => {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  assignNodeIds(root)
  return root
}

const at = (root: HTMLElement, id: string) =>
  root.querySelector(`[${NODE_ATTR}="${id}"]`) as HTMLElement

describe('buildLayerRows', () => {
  const design = '<section><h1>Title</h1><div><p>a</p><p>b</p></div></section>'

  it('shows only what is open, so the tree is a tree and not a dump', () => {
    const root = mount(design)

    expect(buildLayerRows(root, new Set()).map((row) => row.id)).toEqual(['0'])
    expect(buildLayerRows(root, new Set(['0'])).map((row) => row.id)).toEqual(['0', '0.0', '0.1'])
    expect(buildLayerRows(root, new Set(['0', '0.1'])).map((row) => row.id)).toEqual([
      '0',
      '0.0',
      '0.1',
      '0.1.0',
      '0.1.1',
    ])
  })

  it('reports depth and whether a row can open at all', () => {
    const rows = buildLayerRows(mount(design), new Set(['0']))

    expect(rows.map((row) => [row.id, row.depth, row.hasChildren])).toEqual([
      ['0', 0, true],
      ['0.0', 1, false],
      ['0.1', 1, true],
    ])
  })

  it('carries a hidden or locked ancestor down, because the state does', () => {
    const root = mount(design)
    setHidden(at(root, '0'), true)
    setLocked(at(root, '0.1'), true)

    const rows = buildLayerRows(root, new Set(['0', '0.1']))
    const row = (id: string) => rows.find((entry) => entry.id === id)!

    expect(row('0')).toMatchObject({ hidden: true, hiddenAbove: false })
    expect(row('0.0')).toMatchObject({ hidden: false, hiddenAbove: true })
    expect(row('0.1.0')).toMatchObject({ hiddenAbove: true, lockedAbove: true, locked: false })
  })
})

describe('defaultExpanded', () => {
  it('opens the outermost two levels, which is the shape of a design', () => {
    // One wrapper holding a handful of sections: opening only the root shows a
    // single row, and opening everything shows several hundred.
    const root = mount('<div><section><p>a</p></section><section><p>b</p></section></div>')

    expect([...defaultExpanded(root)].sort()).toEqual(['0', '0.0', '0.1'])
  })
})

describe('ancestorIds', () => {
  it('reads ancestors straight off the id, which is a path', () => {
    expect(ancestorIds('0.2.1')).toEqual(['0', '0.2'])
    expect(ancestorIds('0')).toEqual([])
  })
})

describe('hiding', () => {
  it('hides everywhere the design renders, not just in the editor', () => {
    const root = mount('<div><p>a</p></div>')
    const p = at(root, '0.0')

    setHidden(p, true)

    expect(p.style.display).toBe('none')
    expect(isHidden(p)).toBe(true)
  })

  it('remembers the display it replaced rather than guessing on the way back', () => {
    const root = mount('<div><p style="display:inline-flex">a</p></div>')
    const p = at(root, '0.0')

    setHidden(p, true)
    setHidden(p, false)

    expect(p.style.display).toBe('inline-flex')
    expect(p.hasAttribute(HIDDEN_ATTR)).toBe(false)
  })

  it('leaves no inline display behind when there was none to begin with', () => {
    const root = mount('<div><p>a</p></div>')
    const p = at(root, '0.0')

    setHidden(p, true)
    setHidden(p, false)

    expect(p.style.display).toBe('')
  })

  it('ignores a second hide, which would overwrite the memory with none', () => {
    const root = mount('<div><p style="display:grid">a</p></div>')
    const p = at(root, '0.0')

    setHidden(p, true)
    setHidden(p, true)
    setHidden(p, false)

    expect(p.style.display).toBe('grid')
  })
})

describe('locking', () => {
  it('covers the subtree, or locking a finished section would not mean much', () => {
    const root = mount('<section><div><h1>Title</h1></div></section>')
    const section = at(root, '0')
    const heading = at(root, '0.0.0')

    setLocked(section, true)

    expect(isLocked(heading)).toBe(false)
    expect(lockedAncestor(heading, root)).toBe(section)
  })

  it('stops at the root, so an unlocked design answers nothing', () => {
    const root = mount('<section><h1>Title</h1></section>')

    expect(lockedAncestor(at(root, '0.0'), root)).toBeNull()
  })
})

describe('renameNode', () => {
  it('gives the layer the name it was given', () => {
    const root = mount('<div><p>Some very long paragraph of body copy</p></div>')
    const p = at(root, '0.0')

    renameNode(p, 'Intro copy')

    expect(labelFor(p)).toBe('Intro copy')
  })

  it('clears the name so the generated label comes back', () => {
    const root = mount('<div><button>Buy</button></div>')
    const button = at(root, '0.0')

    renameNode(button, 'Primary')
    renameNode(button, '   ')

    expect(labelFor(button)).toBe('Buy')
  })
})

describe('dropLayer', () => {
  const tree = () => mount('<div><p>a</p><section><span>c</span></section><p>b</p></div>')
  const text = (root: HTMLElement) =>
    Array.from(root.firstElementChild!.children).map((child) => child.textContent)

  it('drops a layer before the row it was released on', () => {
    const root = tree()

    expect(dropLayer(at(root, '0.2'), at(root, '0.0'), 'before')).toBe(true)
    expect(text(root)).toEqual(['b', 'a', 'c'])
  })

  it('drops a layer after it', () => {
    const root = tree()

    expect(dropLayer(at(root, '0.0'), at(root, '0.2'), 'after')).toBe(true)
    expect(text(root)).toEqual(['c', 'b', 'a'])
  })

  it('drops a layer inside a container that can hold it', () => {
    const root = tree()

    expect(dropLayer(at(root, '0.0'), at(root, '0.1'), 'inside')).toBe(true)
    expect(at(root, '0.1').textContent).toBe('ca')
  })

  it('refuses to drop something inside itself', () => {
    const root = tree()

    expect(dropLayer(at(root, '0.1'), at(root, '0.1.0'), 'inside')).toBe(false)
    expect(dropLayer(at(root, '0.1'), at(root, '0.1.0'), 'before')).toBe(false)
  })

  it('refuses to put a layer inside something that holds content, not layout', () => {
    // The rule part one settled: a button contains a label, not a section.
    const root = mount('<div><button style="display:flex"><span>Buy</span></button><p>a</p></div>')

    expect(dropLayer(at(root, '0.1'), at(root, '0.0'), 'inside')).toBe(false)
  })

  it('accepts an empty container, which the canvas refuses and a row names', () => {
    const root = mount('<div><div style="display:block"></div><p>a</p></div>')

    expect(dropLayer(at(root, '0.1'), at(root, '0.0'), 'inside')).toBe(true)
    expect(at(root, '0.0').textContent).toBe('a')
  })
})
