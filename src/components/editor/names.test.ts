import { describe, expect, it } from 'vitest'

import {
  NODE_ATTR,
  assignNodeIds,
  directText,
  labelFor,
  layerChildren,
  layerOf,
  setDirectText,
} from './node'

/**
 * What a layer is called.
 *
 * What shipped broken: every div was "Group" and every section "Section", so
 * a page read Group, Group, Group, Group down the left and the only way to
 * find the pricing table was to click each and look at the stage. A layer is
 * named by what it is and, when it has any, by what it says.
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

describe('labelFor', () => {
  it('names a layer by what it is and what it says', () => {
    const root = mount(
      '<header><a>Home</a></header>' +
        '<section class="hero"><h1>Design faster</h1><button>Get started</button></section>' +
        '<footer>Made with Mason</footer>',
    )

    expect(labelFor(at(root, '0'))).toBe('Header')
    expect(labelFor(at(root, '1'))).toBe('Hero: Design faster')
    expect(labelFor(at(root, '1.0'))).toBe('Heading: Design faster')
    expect(labelFor(at(root, '1.1'))).toBe('Button: Get started')
    expect(labelFor(at(root, '2'))).toBe('Footer: Made with Mason')
  })

  it('keeps to a few words and says when there were more', () => {
    const root = mount('<p>Design faster than you can sketch it</p>')

    expect(labelFor(at(root, '0'))).toBe('Text: Design faster than you…')
  })

  // The commonest headline there is, and a `<br>` is not a word.
  it('reads a heading through its line break and its bold run', () => {
    const root = mount('<h1>Design<br><strong>faster</strong></h1>')

    expect(labelFor(at(root, '0'))).toBe('Heading: Design faster')
  })

  it('names a box after its own heading, not the paragraph inside it', () => {
    const root = mount(
      '<section><div><h3>Starter</h3><p>For one person, forever</p></div><div>x</div></section>',
    )

    expect(labelFor(at(root, '0.0'))).toBe('Group: Starter')
  })

  it('takes the role from a class when the tag says nothing', () => {
    const root = mount(
      '<div class="pricing-grid"></div><div class="card"></div><div class="cta-band"></div><div></div>',
    )

    expect(labelFor(at(root, '0'))).toBe('Pricing')
    expect(labelFor(at(root, '1'))).toBe('Card')
    expect(labelFor(at(root, '2'))).toBe('Call to action')
    expect(labelFor(at(root, '3'))).toBe('Group')
  })

  it('names an image by its alt text and a field by its placeholder', () => {
    const root = mount('<img alt="Team photo"><input placeholder="Your email">')

    expect(labelFor(at(root, '0'))).toBe('Image: Team photo')
    expect(labelFor(at(root, '1'))).toBe('Input: Your email')
  })

  /**
   * What shipped broken: the wrapper a generated design puts around
   * everything sat at the top of the tree as "Group" and at the top of the
   * AI panel's `/` list as `/group`, the whole page under a name that says
   * nothing.
   */
  it('calls the wrapper around the sections the Page', () => {
    const root = mount('<div><header>a</header><section>b</section></div>')

    expect(labelFor(at(root, '0'))).toBe('Page')
  })

  it('calls it the Page beside a modal the model left outside it', () => {
    const root = mount(
      '<div><header>a</header><main>b</main></div><div class="modal"><p>Sign in</p></div>',
    )

    expect(labelFor(at(root, '0'))).toBe('Page')
    expect(labelFor(at(root, '1'))).toBe('Group')
  })
})

describe('setDirectText', () => {
  /**
   * What shipped broken: the Content field wrote `textContent`, which on a
   * button holding an icon deleted the icon, so the field was withheld from
   * anything with an element inside it and the label beside an icon could
   * only be changed by double-clicking the stage.
   */
  it('changes the words and leaves the icon alone', () => {
    const root = mount('<button><svg></svg>Buy now</button>')
    const button = at(root, '0')

    setDirectText(button, 'Get started')

    expect(button.querySelector('svg')).not.toBeNull()
    expect(directText(button)).toBe('Get started')
    expect(button.textContent).toBe('Get started')
  })

  it('folds a text split around a break into one run', () => {
    const root = mount('<h1>Design<br>faster</h1>')
    const heading = at(root, '0')

    setDirectText(heading, 'Ship sooner')

    expect(heading.textContent).toBe('Ship sooner')
    expect(heading.querySelectorAll('br')).toHaveLength(1)
  })

  it('gives words to an element that had none', () => {
    const root = mount('<button><svg></svg></button>')
    const button = at(root, '0')

    setDirectText(button, 'Buy')

    expect(button.textContent).toBe('Buy')
    expect(button.querySelector('svg')).not.toBeNull()
  })
})

describe('layerOf', () => {
  /**
   * What shipped broken: the tree does not list a `<strong>` under a heading,
   * so a click on the bold word selected a node the tree could not show, and
   * the ring sat on half a sentence with nothing highlighted on the left.
   */
  it('answers the sentence for a bold word inside it', () => {
    const root = mount('<p>Read <strong>this</strong></p>')

    expect(layerOf(at(root, '0.0'), root)).toBe(at(root, '0'))
  })

  it('answers the element itself for anything laid out', () => {
    const root = mount('<div><span>Badge</span><p>a</p></div>')

    expect(layerOf(at(root, '0.0'), root)).toBe(at(root, '0.0'))
    expect(layerOf(at(root, '0.1'), root)).toBe(at(root, '0.1'))
  })
})

describe('layerChildren', () => {
  it('lists what can be laid out, and not a line break or a bold run', () => {
    const root = mount(
      '<div><h1>Design<br>faster</h1><p>Read <strong>this</strong></p><br><span>x</span></div>',
    )

    expect(layerChildren(at(root, '0')).map((child) => child.tagName)).toEqual(['H1', 'P', 'SPAN'])
    expect(layerChildren(at(root, '0.0'))).toEqual([])
    expect(layerChildren(at(root, '0.1'))).toEqual([])
  })
})
