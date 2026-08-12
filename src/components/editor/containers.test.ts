import { describe, expect, it } from 'vitest'

import { canHostChildren, isRowLayout } from './node'

/**
 * A generated design is a flow layout: some elements arrange children and some
 * are the children. The editor accepted any node under the pointer as a drop
 * target and inserted into its parent, so dragging a card across a nav dropped
 * the card into the nav and the page rearranged itself.
 */
const el = (html: string) => {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  return host.firstElementChild as HTMLElement
}

describe('canHostChildren', () => {
  it.each([
    ['a button', '<button style="display:flex"><span>Buy</span></button>'],
    ['a link', '<a href="#" style="display:flex"><span>Home</span></a>'],
    ['a heading', '<h2 style="display:flex"><span>Title</span></h2>'],
    ['a paragraph', '<p style="display:block"><span>Body</span></p>'],
    ['a list item', '<li style="display:flex"><span>One</span></li>'],
  ])('refuses %s, which holds content rather than layout', (_label, html) => {
    expect(canHostChildren(el(html))).toBe(false)
  })

  it.each([
    ['a section', '<section style="display:block"><div>a</div></section>'],
    ['a flex row', '<div style="display:flex"><div>a</div><div>b</div></div>'],
    ['a grid', '<div style="display:grid"><div>a</div></div>'],
    ['a nav', '<nav style="display:flex"><div>a</div></nav>'],
  ])('accepts %s', (_label, html) => {
    expect(canHostChildren(el(html))).toBe(true)
  })

  it('refuses an empty box, which is usually a spacer', () => {
    expect(canHostChildren(el('<div style="display:block"></div>'))).toBe(false)
  })

  it('refuses something that is not displayed', () => {
    expect(canHostChildren(el('<div style="display:none"><div>a</div></div>'))).toBe(false)
  })
})

describe('isRowLayout', () => {
  it('reads a flex row', () => {
    expect(isRowLayout(el('<div style="display:flex;flex-direction:row"><i>a</i></div>'))).toBe(true)
  })

  it('reads a flex column as not a row', () => {
    expect(isRowLayout(el('<div style="display:flex;flex-direction:column"><i>a</i></div>'))).toBe(
      false,
    )
  })

  it('treats a multi-column grid as a row', () => {
    // Children sit beside each other, so "before" means left, not above.
    expect(
      isRowLayout(el('<div style="display:grid;grid-template-columns:1fr 1fr"><i>a</i></div>')),
    ).toBe(true)
  })

  it('treats a single-column grid as stacked', () => {
    expect(
      isRowLayout(el('<div style="display:grid;grid-template-columns:1fr"><i>a</i></div>')),
    ).toBe(false)
  })

  it('treats ordinary block flow as stacked', () => {
    expect(isRowLayout(el('<div style="display:block"><i>a</i></div>'))).toBe(false)
  })
})
