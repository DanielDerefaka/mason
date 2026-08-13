import { describe, expect, it } from 'vitest'

import {
  COMPONENT_ATTR,
  NODE_ATTR,
  assignNodeIds,
  buildLayerRows,
  componentAncestor,
  componentName,
  componentsIn,
  instancesOf,
  pushToInstances,
  setComponentName,
} from './node'

/**
 * A component is a subtree with a name on it, and instances are copies
 * carrying the same name. There is no main and no override model: the design
 * is a live DOM, and an override that survived regeneration would need an
 * identity that positional ids deliberately do not have.
 *
 * What follows from that is the thing worth testing — pushing is a deliberate
 * act, it is the only thing that makes instances agree, and it must not eat
 * the tree on the way past.
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

describe('naming', () => {
  it('makes a subtree a component', () => {
    const root = mount('<div><section><h1>A</h1></section></div>')
    const section = at(root, '0.0')

    setComponentName(section, 'Hero')

    expect(componentName(section)).toBe('Hero')
    expect(section.getAttribute(COMPONENT_ATTR)).toBe('Hero')
  })

  it('detaches by clearing the name, leaving the markup where it was', () => {
    const root = mount('<div><section data-mason-component="Hero"><h1>A</h1></section></div>')
    const section = at(root, '0.0')

    setComponentName(section, '')

    expect(componentName(section)).toBeNull()
    expect(section.querySelector('h1')?.textContent).toBe('A')
  })

  it('finds the component a node is part of, which may be the node', () => {
    const root = mount('<div><section data-mason-component="Hero"><h1>A</h1></section></div>')
    const section = at(root, '0.0')

    expect(componentAncestor(at(root, '0.0.0'), root)).toBe(section)
    expect(componentAncestor(section, root)).toBe(section)
  })

  it('reports nothing for a node outside any component', () => {
    const root = mount('<div><section><h1>A</h1></section></div>')

    expect(componentAncestor(at(root, '0.0.0'), root)).toBeNull()
  })
})

describe('componentsIn', () => {
  it('counts the instances of each name', () => {
    const root = mount(
      '<div>' +
        '<div data-mason-component="Card"><p>a</p></div>' +
        '<div data-mason-component="Card"><p>b</p></div>' +
        '<div data-mason-component="Nav"><p>c</p></div>' +
        '</div>',
    )

    expect(componentsIn(root)).toEqual([
      { name: 'Card', count: 2 },
      { name: 'Nav', count: 1 },
    ])
  })

  it('groups by name even when the instances have drifted apart', () => {
    // Two instances that no longer match are still one component; which of
    // them wins is the user's call, made by pushing.
    const root = mount(
      '<div><div data-mason-component="Card"><p>a</p></div>' +
        '<div data-mason-component="Card"><p>changed</p><span>extra</span></div></div>',
    )

    expect(componentsIn(root)).toEqual([{ name: 'Card', count: 2 }])
    expect(instancesOf(root, 'Card')).toHaveLength(2)
  })
})

describe('pushToInstances', () => {
  const two = () =>
    mount(
      '<div>' +
        '<div data-mason-component="Card" style="color: red"><p>edited</p></div>' +
        '<div data-mason-component="Card"><p>old</p></div>' +
        '<div data-mason-component="Card"><p>old</p></div>' +
        '</div>',
    )

  it('makes every other instance look like this one', () => {
    const root = two()

    expect(pushToInstances(root, at(root, '0.0'))).toBe(2)
    expect(Array.from(root.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      'edited',
      'edited',
      'edited',
    ])
  })

  it('carries the styles across, not just the content', () => {
    const root = two()

    pushToInstances(root, at(root, '0.0'))

    expect(
      Array.from(root.querySelectorAll<HTMLElement>('[data-mason-component]')).every(
        (node) => node.style.color === 'red',
      ),
    ).toBe(true)
  })

  it('leaves the source alone', () => {
    const root = two()
    const source = at(root, '0.0')

    pushToInstances(root, source)

    expect(source.isConnected).toBe(true)
    expect(source.querySelector('p')?.textContent).toBe('edited')
  })

  it('reports how many changed, so "pushed" is never a claim about nothing', () => {
    const root = mount('<div><div data-mason-component="Solo"><p>a</p></div></div>')

    expect(pushToInstances(root, at(root, '0.0'))).toBe(0)
  })

  it('refuses an instance nested inside itself rather than destroying the tree', () => {
    // Replacing an ancestor with a copy of its own descendant detaches the
    // node being read from, and the design is gone with it.
    const root = mount(
      '<div><div data-mason-component="Card"><div data-mason-component="Card"><p>a</p></div></div></div>',
    )

    expect(pushToInstances(root, at(root, '0.0.0'))).toBe(0)
    expect(root.querySelectorAll('[data-mason-component]')).toHaveLength(2)
  })

  it('does nothing for a node that is not a component', () => {
    const root = mount('<div><section><p>a</p></section></div>')

    expect(pushToInstances(root, at(root, '0.0'))).toBe(0)
  })
})

describe('the layer tree', () => {
  it('marks which rows are components, so the tree says what you are editing', () => {
    const root = mount('<div data-mason-component="Card"><p>a</p></div>')
    const [row] = buildLayerRows(root, new Set())

    expect(row.component).toBe('Card')
  })

  it('leaves an ordinary group unmarked', () => {
    const root = mount('<div><p>a</p></div>')

    expect(buildLayerRows(root, new Set())[0].component).toBeNull()
  })
})
