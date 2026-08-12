import { describe, expect, it } from 'vitest'

import {
  alignWrites,
  alignmentOf,
  applyWrites,
  containerAlignWrites,
  containerAlignment,
  fillWrites,
  formatGradient,
  isFilling,
  layoutMode,
  layoutWrites,
  nodeMarkup,
  parentAxis,
  parseGradient,
  readFillLayers,
  readRotation,
  readShadows,
  readStrokes,
  removeStrokeWrites,
  sizeWrites,
  strokeWrites,
  withRotation,
  writeFillLayers,
  writeShadows,
} from './node'

/**
 * The inspector's rules.
 *
 * Most of the panel is a control bound to one property, which is not worth a
 * test. What is worth one is everywhere a single-looking edit is several
 * declarations, or where the right declaration depends on what the parent is
 * doing — which is the whole of the sizing story and most of the alignment
 * one.
 */
const mount = (html: string) => {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  return host.firstElementChild as HTMLElement
}

const child = (html: string, index = 0) => mount(html).children[index] as HTMLElement

const ROW = 'display:flex;flex-direction:row'
const COLUMN = 'display:flex;flex-direction:column'

describe('sizeWrites', () => {
  it('writes a plain width outside a flex container', () => {
    const node = child('<div style="display:block"><p>a</p></div>')

    expect(sizeWrites(node, 'width', '240px')).toEqual([['width', '240px']])
  })

  it('writes a basis along a row, because width alone loses to flex', () => {
    // The constraint this exists for: a resize used to set width on a flex
    // child, where flex-basis wins and a sibling with flex:1 takes the space
    // back — so the handle either did nothing or broke the row behind it.
    const node = child(`<div style="${ROW}"><p>a</p><p>b</p></div>`)

    expect(sizeWrites(node, 'width', '240px')).toEqual([
      ['width', '240px'],
      ['flex-grow', '0'],
      ['flex-shrink', '0'],
      ['flex-basis', '240px'],
    ])
  })

  it('leaves the cross axis alone, where width means what it says', () => {
    const node = child(`<div style="${ROW}"><p>a</p></div>`)

    expect(sizeWrites(node, 'height', '80px')).toEqual([['height', '80px']])
  })

  it('follows the column, so a height is the basis there instead', () => {
    const node = child(`<div style="${COLUMN}"><p>a</p></div>`)

    expect(sizeWrites(node, 'height', '80px')).toEqual([
      ['height', '80px'],
      ['flex-grow', '0'],
      ['flex-shrink', '0'],
      ['flex-basis', '80px'],
    ])
    expect(sizeWrites(node, 'width', '80px')).toEqual([['width', '80px']])
  })

  it('clears the basis again when the size goes back to auto', () => {
    const node = child(`<div style="${ROW}"><p>a</p></div>`)

    expect(sizeWrites(node, 'width', 'auto')).toEqual([
      ['width', 'auto'],
      ['flex-grow', ''],
      ['flex-shrink', ''],
      ['flex-basis', ''],
    ])
  })
})

describe('fillWrites', () => {
  it('grows along the parent axis', () => {
    const node = child(`<div style="${ROW}"><p>a</p></div>`)

    expect(fillWrites(node, 'width')).toEqual([
      ['width', 'auto'],
      ['flex-grow', '1'],
      ['flex-shrink', '1'],
      ['flex-basis', '0'],
    ])
  })

  it('stretches across it, where a percentage has nothing to measure against', () => {
    const node = child(`<div style="${ROW}"><p>a</p></div>`)

    expect(fillWrites(node, 'height')).toEqual([
      ['height', 'auto'],
      ['align-self', 'stretch'],
    ])
  })

  it('falls back to a percentage in ordinary block flow', () => {
    const node = child('<div style="display:block"><p>a</p></div>')

    expect(fillWrites(node, 'width')).toEqual([['width', '100%']])
  })

  it('reads back as filling once it has been applied', () => {
    const row = child(`<div style="${ROW}"><p>a</p></div>`)
    const block = child('<div style="display:block"><p>a</p></div>')

    applyWrites(row, fillWrites(row, 'width'))
    applyWrites(block, fillWrites(block, 'width'))

    expect(isFilling(row, 'width')).toBe(true)
    expect(isFilling(block, 'width')).toBe(true)
  })

  it('does not report a child of a stretching row as filling deliberately', () => {
    // align-self: auto resolves against the parent, so a computed read would
    // call every child of a stretching container a deliberate fill.
    const node = child(`<div style="${ROW};align-items:stretch"><p>a</p></div>`)

    expect(isFilling(node, 'height')).toBe(false)
  })
})

describe('alignWrites', () => {
  it('uses align-self across the parent axis', () => {
    const node = child(`<div style="${ROW}"><p>a</p></div>`)

    expect(alignWrites(node, 'vertical', 'center')).toEqual([['align-self', 'center']])
    expect(alignWrites(node, 'vertical', 'end')).toEqual([['align-self', 'flex-end']])
  })

  it('uses auto margins along it, which is the only thing that moves one child', () => {
    const node = child(`<div style="${ROW}"><p>a</p></div>`)

    expect(alignWrites(node, 'horizontal', 'end')).toEqual([
      ['margin-left', 'auto'],
      ['margin-right', '0'],
    ])
    expect(alignWrites(node, 'horizontal', 'center')).toEqual([
      ['margin-left', 'auto'],
      ['margin-right', 'auto'],
    ])
  })

  it('swaps the two mechanisms over in a column', () => {
    const node = child(`<div style="${COLUMN}"><p>a</p></div>`)

    expect(alignWrites(node, 'horizontal', 'center')).toEqual([['align-self', 'center']])
    expect(alignWrites(node, 'vertical', 'start')).toEqual([
      ['margin-top', '0'],
      ['margin-bottom', 'auto'],
    ])
  })

  it('refuses to align vertically in block flow rather than writing nothing useful', () => {
    const node = child('<div style="display:block"><p>a</p></div>')

    expect(alignWrites(node, 'vertical', 'center')).toEqual([])
    expect(alignWrites(node, 'horizontal', 'center')).toEqual([
      ['margin-left', 'auto'],
      ['margin-right', 'auto'],
    ])
  })

  it('reads its own writing back, so the button that did it lights up', () => {
    const node = child(`<div style="${ROW}"><p>a</p></div>`)

    applyWrites(node, alignWrites(node, 'horizontal', 'end'))
    applyWrites(node, alignWrites(node, 'vertical', 'center'))

    expect(alignmentOf(node, 'horizontal')).toBe('end')
    expect(alignmentOf(node, 'vertical')).toBe('center')
  })

  it('reports nothing when nothing has been aligned', () => {
    const node = child(`<div style="${ROW}"><p>a</p></div>`)

    expect(alignmentOf(node, 'horizontal')).toBeNull()
    expect(alignmentOf(node, 'vertical')).toBeNull()
  })
})

describe('parentAxis', () => {
  it.each([
    ['a row', ROW, 'horizontal'],
    ['a column', COLUMN, 'vertical'],
  ])('reads %s', (_label, style, axis) => {
    expect(parentAxis(child(`<div style="${style}"><p>a</p></div>`))).toBe(axis)
  })

  it('is null when the parent is not arranging anything', () => {
    expect(parentAxis(child('<div style="display:block"><p>a</p></div>'))).toBeNull()
  })
})

describe('layout', () => {
  it.each([
    ['block', 'display:block', 'block'],
    ['a row', ROW, 'row'],
    ['a column', COLUMN, 'column'],
    ['a grid', 'display:grid', 'grid'],
  ])('reads %s', (_label, style, mode) => {
    expect(layoutMode(mount(`<div style="${style}"><p>a</p></div>`))).toBe(mode)
  })

  it('clears what flex added rather than setting it back to an initial value', () => {
    // Cleared, so the container falls back to its tag and the design's own
    // stylesheet — which is where it was before anyone touched it.
    const node = mount(`<div style="${ROW};align-items:center"><p>a</p></div>`)

    applyWrites(node, layoutWrites('block'))

    expect(node.getAttribute('style')).toBe('')
  })

  it('turns a container into a column', () => {
    const node = mount('<div style="display:block"><p>a</p></div>')

    applyWrites(node, layoutWrites('column'))

    expect(layoutMode(node)).toBe('column')
  })
})

describe('containerAlignWrites', () => {
  it('maps the pad onto justify and align, in a row', () => {
    const node = mount(`<div style="${ROW}"><p>a</p></div>`)

    expect(containerAlignWrites(node, 'center', 'end')).toEqual([
      ['justify-content', 'center'],
      ['align-items', 'flex-end'],
    ])
  })

  it('swaps them in a column, where horizontal is the cross axis', () => {
    // A pad that wrote justify-content for horizontal regardless would move
    // children up and down in a column.
    const node = mount(`<div style="${COLUMN}"><p>a</p></div>`)

    expect(containerAlignWrites(node, 'center', 'end')).toEqual([
      ['align-items', 'center'],
      ['justify-content', 'flex-end'],
    ])
  })

  it('reads the pad back through the same swap', () => {
    const node = mount(`<div style="${COLUMN}"><p>a</p></div>`)

    applyWrites(node, containerAlignWrites(node, 'end', 'center'))

    expect(containerAlignment(node)).toEqual({ horizontal: 'end', vertical: 'center' })
  })
})

describe('rotation', () => {
  it('reads a rotation the editor wrote', () => {
    const node = mount('<div style="transform:rotate(12deg)"></div>')

    expect(readRotation(node)).toBe(12)
  })

  it('is zero when there is no transform at all', () => {
    expect(readRotation(mount('<div></div>'))).toBe(0)
  })

  it('leaves everything else the transform does alone', () => {
    expect(withRotation('translateY(-4px) rotate(10deg) scale(2)', 45)).toBe(
      'translateY(-4px) scale(2) rotate(45deg)',
    )
  })

  it('removes the rotation rather than writing a zero', () => {
    expect(withRotation('rotate(10deg)', 0)).toBe('')
    expect(withRotation('scale(2) rotate(10deg)', 0)).toBe('scale(2)')
  })
})

describe('shadows', () => {
  it('reads a list as a list, commas inside a colour and all', () => {
    // One value, not four: splitting on every comma is how a shadow list gets
    // shredded into nonsense.
    const node = mount(
      '<div style="box-shadow:0 1px 2px 0 rgba(0, 0, 0, 0.4), inset 0 0 0 1px #ffffff"></div>',
    )

    expect(readShadows(node)).toEqual([
      { x: 0, y: 1, blur: 2, spread: 0, colour: 'rgba(0, 0, 0, 0.4)', inset: false },
      { x: 0, y: 0, blur: 0, spread: 1, colour: '#ffffff', inset: true },
    ])
  })

  it('is empty when there is no shadow', () => {
    expect(readShadows(mount('<div style="box-shadow:none"></div>'))).toEqual([])
  })

  it('round-trips through the editor without losing the other layers', () => {
    const node = mount('<div style="box-shadow:0 1px 2px 0 rgba(0, 0, 0, 0.4)"></div>')
    const shadows = readShadows(node)

    const written = writeShadows([...shadows, { ...shadows[0], y: 8, inset: true }])

    expect(written).toBe(
      '0px 1px 2px 0px rgba(0, 0, 0, 0.4), inset 0px 8px 2px 0px rgba(0, 0, 0, 0.4)',
    )
    expect(readShadows(mount(`<div style="box-shadow:${written}"></div>`))).toHaveLength(2)
  })

  it('writes none for an empty list, so removing the last one removes it', () => {
    expect(writeShadows([])).toBe('none')
  })
})

describe('fill layers', () => {
  it('reads the layers painted over the background colour', () => {
    const node = mount(
      '<div style="background-image:linear-gradient(180deg, rgba(0, 0, 0, 0), #000000), url(/api/image/1)"></div>',
    )

    // Read back as the engine normalises them — a hex becomes rgb() and a url
    // gains its quotes — which is why the gradient parser matches on colour
    // functions rather than on what was typed.
    expect(readFillLayers(node)).toEqual([
      'linear-gradient(180deg, rgba(0, 0, 0, 0), rgb(0, 0, 0))',
      'url("/api/image/1")',
    ])
  })

  it('is empty when there are none', () => {
    expect(readFillLayers(mount('<div></div>'))).toEqual([])
    expect(writeFillLayers([])).toBe('none')
  })

  it('reads a two-stop gradient it can edit', () => {
    expect(parseGradient('linear-gradient(90deg, #ffffff, #000000)')).toEqual({
      angle: 90,
      from: '#ffffff',
      to: '#000000',
    })
  })

  it('takes the colour out of a stop that carries a position too', () => {
    expect(parseGradient('linear-gradient(90deg, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)')).toEqual(
      { angle: 90, from: 'rgb(0, 0, 0)', to: 'rgb(255, 255, 255)' },
    )
  })

  it('assumes the default direction when the computed value dropped it', () => {
    expect(parseGradient('linear-gradient(#ffffff, #000000)')).toEqual({
      angle: 180,
      from: '#ffffff',
      to: '#000000',
    })
  })

  it('refuses anything richer rather than flattening it into two stops', () => {
    // Three stops shown as two controls would throw the middle one away on the
    // first edit, so it is shown as the CSS it is instead.
    expect(parseGradient('linear-gradient(90deg, #fff, #888, #000)')).toBeNull()
    expect(parseGradient('radial-gradient(#fff, #000)')).toBeNull()
    expect(parseGradient('url(/api/image/1)')).toBeNull()
  })

  it('formats what it parsed', () => {
    expect(formatGradient({ angle: 45, from: '#ffffff', to: '#000000' })).toBe(
      'linear-gradient(45deg, #ffffff, #000000)',
    )
  })
})

describe('strokes', () => {
  it('reads four agreeing sides as one stroke', () => {
    const node = mount('<div style="border:2px solid #ff0000"></div>')

    expect(readStrokes(node)).toEqual([
      { sides: 'all', width: 2, style: 'solid', colour: '#ff0000' },
    ])
  })

  it('reads sides that disagree as one stroke each', () => {
    const node = mount(
      '<div style="border-top:1px solid #ff0000;border-bottom:3px dashed #0000ff"></div>',
    )

    expect(readStrokes(node)).toEqual([
      { sides: 'top', width: 1, style: 'solid', colour: '#ff0000' },
      { sides: 'bottom', width: 3, style: 'dashed', colour: '#0000ff' },
    ])
  })

  it('has nothing to show when there is no border', () => {
    expect(readStrokes(mount('<div></div>'))).toEqual([])
    expect(readStrokes(mount('<div style="border:0 solid #000000"></div>'))).toEqual([])
  })

  it('writes one side without touching the others', () => {
    expect(strokeWrites({ sides: 'top', width: 1, style: 'solid', colour: '#000000' })).toEqual([
      ['border-top-width', '1px'],
      ['border-top-style', 'solid'],
      ['border-top-color', '#000000'],
    ])
  })

  it('removes a stroke by taking its width away as well as its style', () => {
    const node = mount('<div style="border:2px solid #ff0000"></div>')

    applyWrites(node, removeStrokeWrites(readStrokes(node)[0]))

    expect(readStrokes(node)).toEqual([])
  })
})

describe('nodeMarkup', () => {
  it('shows the node without the editor bookkeeping the user must not edit', () => {
    const node = mount('<section data-mason-id="0"><p data-mason-id="0.0">a</p></section>')
    node.setAttribute('contenteditable', 'true')

    const markup = nodeMarkup(node)

    expect(markup).not.toContain('data-mason-id')
    expect(markup).not.toContain('contenteditable')
    expect(markup).toContain('<p>a</p>')
  })

  it('does not disturb the node it is reading', () => {
    const node = mount('<section data-mason-id="0"><p data-mason-id="0.0">a</p></section>')

    nodeMarkup(node)

    expect(node.getAttribute('data-mason-id')).toBe('0')
  })
})
