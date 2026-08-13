import { describe, expect, it } from 'vitest'

import {
  NODE_ATTR,
  assignNodeIds,
  canEditInline,
  sectionScope,
  duplicateNode,
  moveNode,
  parseLength,
  serialise,
  stripRings,
} from './node'

const mount = (html: string) => {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

const ids = (root: HTMLElement) =>
  Array.from(root.querySelectorAll(`[${NODE_ATTR}]`)).map((node) =>
    node.getAttribute(NODE_ATTR),
  )

describe('assignNodeIds', () => {
  it('stamps the child-index path, so an id describes a position', () => {
    const root = mount('<section><h1>A</h1><div><p>B</p><p>C</p></div></section>')
    assignNodeIds(root)

    expect(ids(root)).toEqual(['0', '0.0', '0.1', '0.1.0', '0.1.1'])
  })

  it('re-derives ids after a move rather than carrying them along', () => {
    // The property the whole scheme rests on: ids are a function of the tree,
    // not of the node. Regeneration can therefore land on the same paths.
    const root = mount('<div><p>first</p><p>second</p></div>')
    assignNodeIds(root)

    const second = root.querySelector('[data-mason-id="0.1"]') as HTMLElement
    expect(second.textContent).toBe('second')

    moveNode(second, -1)
    assignNodeIds(root)

    expect(
      (root.querySelector('[data-mason-id="0.0"]') as HTMLElement).textContent,
    ).toBe('second')
  })
})

describe('what is not a layer', () => {
  /**
   * A generated design carries its own stylesheet. Stamping it made it a
   * layer: first row of the tree, labelled with its own CSS, a slot in the AI
   * panel's section list — and selectable, so a user could delete every hover,
   * focus state and breakpoint the design had and see nothing happen on
   * screen to explain it.
   */
  it('does not stamp the design stylesheet', () => {
    const root = mount('<style>.a{color:red}</style><section><h1>A</h1></section>')
    assignNodeIds(root)

    expect(root.querySelector('style')?.hasAttribute(NODE_ATTR)).toBe(false)
    expect(ids(root)).toEqual(['1', '1.0'])
  })

  it('keeps the ids a true child path, so a restamp lands on the same nodes', () => {
    // The skipped element still occupies its index — otherwise every id after
    // the stylesheet would shift by one and no selection would survive.
    const root = mount('<div><style>.a{}</style><p>first</p><p>second</p></div>')
    assignNodeIds(root)

    expect(
      (root.querySelector('[data-mason-id="0.2"]') as HTMLElement).textContent,
    ).toBe('second')
  })
})

describe('sectionScope', () => {
  /**
   * Addressing a section by name in the AI panel read the stage's own
   * children, and a generated design wraps everything in one div — so the only
   * destination on offer was "Group", and every renamed section was
   * unreachable.
   */
  it('descends through the wrapper a design puts everything in', () => {
    const root = mount('<div><header>A</header><section>B</section><footer>C</footer></div>')
    assignNodeIds(root)

    expect(sectionScope(root).tagName).toBe('DIV')
    expect(Array.from(sectionScope(root).children).map((c) => c.tagName)).toEqual([
      'HEADER',
      'SECTION',
      'FOOTER',
    ])
  })

  it('stays put when the design is already a run of sections', () => {
    const root = mount('<header>A</header><section>B</section>')
    assignNodeIds(root)

    expect(sectionScope(root)).toBe(root)
  })

  it('does not mistake a single section for its own contents', () => {
    // One wrapper holding one section: descending twice would offer the
    // section's heading and paragraph as destinations.
    const root = mount('<div><section><h1>A</h1><p>b</p></section></div>')
    assignNodeIds(root)

    expect(Array.from(sectionScope(root).children).map((c) => c.tagName)).toEqual(['SECTION'])
  })

  it('ignores the stylesheet when deciding what the wrapper holds', () => {
    const root = mount('<div><style>.a{}</style><section><h1>A</h1></section></div>')
    assignNodeIds(root)

    expect(Array.from(sectionScope(root).children).map((c) => c.tagName)).toEqual([
      'STYLE',
      'SECTION',
    ])
  })
})

describe('serialise', () => {
  it('strips the selection ring, which used to be saved into every design', () => {
    // The regression this exists for. The ring is an inline outline on the
    // node itself, so it is part of innerHTML — it reached the canvas, the
    // export and the next prompt before this was fixed.
    const root = mount('<div><button>Buy</button></div>')
    assignNodeIds(root)
    const button = root.querySelector('button') as HTMLElement
    button.style.outline = '2px solid #4f46e5'
    button.style.outlineOffset = '2px'

    const html = serialise(root)

    expect(html).not.toContain('outline')
    expect(html).toContain('<button>Buy</button>')
  })

  it('leaves an element with no other inline style with no style attribute', () => {
    const root = mount('<div><span>Hi</span></div>')
    assignNodeIds(root)
    ;(root.querySelector('span') as HTMLElement).style.outline = '2px solid red'

    expect(serialise(root)).not.toContain('style')
  })

  it('keeps the styles the design actually has', () => {
    const root = mount('<div><span style="color: red">Hi</span></div>')
    assignNodeIds(root)
    const span = root.querySelector('span') as HTMLElement
    span.style.outline = '2px solid blue'

    const html = serialise(root)

    expect(html).toContain('color: red')
    expect(html).not.toContain('outline')
  })

  it('drops the editor attributes so stored markup is plain HTML', () => {
    const root = mount('<div><p>Text</p></div>')
    assignNodeIds(root)
    ;(root.querySelector('p') as HTMLElement).setAttribute('contenteditable', 'true')

    const html = serialise(root)

    expect(html).not.toContain(NODE_ATTR)
    expect(html).not.toContain('contenteditable')
  })

  it('does not mutate the live tree it serialises', () => {
    const root = mount('<div><p>Text</p></div>')
    assignNodeIds(root)

    serialise(root)

    // The editor keeps working on the same nodes after a save.
    expect(root.querySelector('p')?.getAttribute(NODE_ATTR)).toBe('0.0')
  })
})

describe('stripRings', () => {
  it('cleans designs saved before serialise was fixed', () => {
    const root = mount('<div><p style="color: red; outline: 2px solid #4f46e5">Old</p></div>')

    stripRings(root)

    expect(root.innerHTML).not.toContain('outline')
    expect(root.innerHTML).toContain('color: red')
  })
})

describe('moveNode', () => {
  it('moves a node one place up', () => {
    const root = mount('<div><p>a</p><p>b</p><p>c</p></div>')
    const b = root.querySelectorAll('p')[1] as HTMLElement

    expect(moveNode(b, -1)).toBe(true)
    expect(Array.from(root.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      'b',
      'a',
      'c',
    ])
  })

  it('moves a node one place down', () => {
    const root = mount('<div><p>a</p><p>b</p><p>c</p></div>')
    const b = root.querySelectorAll('p')[1] as HTMLElement

    expect(moveNode(b, 1)).toBe(true)
    expect(Array.from(root.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      'a',
      'c',
      'b',
    ])
  })

  it('refuses at the ends rather than wrapping', () => {
    const root = mount('<div><p>a</p><p>b</p></div>')
    const [a, b] = Array.from(root.querySelectorAll('p')) as HTMLElement[]

    expect(moveNode(a, -1)).toBe(false)
    expect(moveNode(b, 1)).toBe(false)
    expect(Array.from(root.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      'a',
      'b',
    ])
  })
})

describe('duplicateNode', () => {
  it('inserts the copy directly after the original', () => {
    const root = mount('<div><p>a</p><p>b</p></div>')
    const a = root.querySelector('p') as HTMLElement

    const copy = duplicateNode(a)

    expect(copy?.textContent).toBe('a')
    expect(Array.from(root.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      'a',
      'a',
      'b',
    ])
  })

  it('copies the subtree, not just the element', () => {
    const root = mount('<div><section><h2>Title</h2><p>Body</p></section></div>')
    const section = root.querySelector('section') as HTMLElement

    const copy = duplicateNode(section)

    expect(copy?.querySelectorAll('*')).toHaveLength(2)
  })
})

describe('canEditInline', () => {
  const first = (html: string) => mount(html).firstElementChild as HTMLElement

  it('accepts a leaf with text', () => {
    expect(canEditInline(first('<p>Hello</p>'))).toBe(true)
  })

  it('accepts a heading with a line break in it', () => {
    // The commonest headline there is. The old rule refused any element child
    // at all, so double-clicking a two-line heading did nothing and said
    // nothing.
    expect(canEditInline(first('<h1>Every ad dollar,<br>traced to revenue.</h1>'))).toBe(true)
  })

  it('accepts a run of text with formatting inside it', () => {
    expect(canEditInline(first('<p>Ship <strong>faster</strong> today</p>'))).toBe(true)
  })

  it('rejects a node with structural children, so typing cannot eat the subtree', () => {
    expect(canEditInline(first('<div><section>Hello</section></div>'))).toBe(false)
    expect(canEditInline(first('<div><p>a</p><p>b</p></div>'))).toBe(false)
  })

  it('rejects a link inside the text, which typing would destroy', () => {
    expect(canEditInline(first('<p>Read the <a href="#">terms</a></p>'))).toBe(false)
  })

  it('rejects empty text', () => {
    expect(canEditInline(first('<p>   </p>'))).toBe(false)
  })

  it('rejects replaced elements', () => {
    expect(canEditInline(first('<img alt="a">'))).toBe(false)
  })
})

describe('parseLength', () => {
  it.each([
    ['16px', { value: 16, unit: 'px' }],
    ['50%', { value: 50, unit: '%' }],
    ['1.5rem', { value: 1.5, unit: 'rem' }],
    ['100vh', { value: 100, unit: 'vh' }],
    ['-8px', { value: -8, unit: 'px' }],
    ['  24px  ', { value: 24, unit: 'px' }],
  ])('reads %s', (input, expected) => {
    expect(parseLength(input)).toEqual(expected)
  })

  it('treats a bare number as pixels, which is what a number input gives back', () => {
    expect(parseLength('24')).toEqual({ value: 24, unit: 'px' })
  })

  it.each(['auto', '', 'calc(100% - 2rem)', 'clamp(1rem, 2vw, 3rem)'])(
    'reports %s as unparseable rather than guessing',
    (input) => {
      // A control that rounds a clamp() down to a number would silently
      // destroy the responsive sizing the generator writes.
      expect(parseLength(input)).toEqual({ value: 0, unit: 'auto' })
    },
  )
})
