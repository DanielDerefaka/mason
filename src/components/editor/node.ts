/**
 * Working with the nodes of a generated design.
 *
 * The design is HTML with inline styles, so the rendered DOM is the document
 * — there is no parallel model to keep in sync. Editing means mutating a node
 * and reading `innerHTML` back out.
 */

/** Marks every element so a selection can survive a re-render. */
export const NODE_ATTR = 'data-mason-id'

/**
 * Stamps a structural id on every element: the child index path from the root,
 * so `0.2.1` is the second child of the third child of the first.
 *
 * Positional rather than random because the design is regenerated from the
 * model, and an id that maps to a position can find its way back onto the same
 * node afterwards. A random uuid would be orphaned by the next generation.
 */
export const assignNodeIds = (root: HTMLElement) => {
  const walk = (element: Element, path: string) => {
    element.setAttribute(NODE_ATTR, path)
    Array.from(element.children).forEach((child, index) => {
      walk(child, path ? `${path}.${index}` : String(index))
    })
  }
  Array.from(root.children).forEach((child, index) => walk(child, String(index)))
}

/** Strips the editor's own bookkeeping before the markup is stored. */
export const serialise = (root: HTMLElement): string => {
  const clone = root.cloneNode(true) as HTMLElement
  for (const element of Array.from(clone.querySelectorAll(`[${NODE_ATTR}]`))) {
    element.removeAttribute(NODE_ATTR)
  }
  return clone.innerHTML
}

export const findNode = (root: HTMLElement, id: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`[${NODE_ATTR}="${CSS.escape(id)}"]`)

/** A readable name for the layers tree. */
export const labelFor = (element: HTMLElement): string => {
  const tag = element.tagName.toLowerCase()
  const NAMES: Record<string, string> = {
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    h4: 'Heading 4',
    p: 'Paragraph',
    a: 'Link',
    button: 'Button',
    img: 'Image',
    ul: 'List',
    li: 'List item',
    span: 'Text',
    section: 'Section',
    header: 'Header',
    footer: 'Footer',
    nav: 'Nav',
    input: 'Input',
    label: 'Label',
    svg: 'Icon',
  }

  const direct = directText(element)
  if (direct) return direct.length > 26 ? `${direct.slice(0, 26)}…` : direct
  return NAMES[tag] ?? (tag === 'div' ? 'Group' : tag)
}

/**
 * The element's own text, ignoring text belonging to its children — so a
 * wrapper containing a heading is not mistaken for the heading itself.
 */
export const directText = (element: HTMLElement): string =>
  Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim()

/** True when a node's content is a single run of text we can safely replace. */
export const isTextEditable = (element: HTMLElement): boolean =>
  element.children.length === 0 && element.textContent !== null

/**
 * Reads a style property as it is actually rendering.
 *
 * Inline styles alone are not enough: the model writes some properties and
 * leaves others to the browser, and an inspector that showed a blank for
 * "colour" on visibly coloured text would be lying.
 */
export const readStyle = (element: HTMLElement, property: string): string =>
  element.style.getPropertyValue(property) || getComputedStyle(element).getPropertyValue(property)

/** rgb()/rgba() → #rrggbb, so a colour input can show it. */
export const toHex = (value: string): string => {
  const trimmed = value.trim()
  if (trimmed.startsWith('#')) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed.slice(0, 7)
  }
  const match = trimmed.match(/rgba?\(([^)]+)\)/)
  if (!match) return '#000000'
  const [r, g, b] = match[1].split(',').map((part) => Number.parseFloat(part))
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n || 0))).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}
