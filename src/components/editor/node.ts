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

/**
 * Strips the editor's own bookkeeping before the markup is stored.
 *
 * The selection ring is drawn as an inline `outline` on the node itself, which
 * means it is part of `innerHTML` — without clearing it here, every design
 * left the editor with a blue ring baked into it and carried that ring into
 * the canvas, the export and the next prompt.
 */
export const serialise = (root: HTMLElement): string => {
  const clone = root.cloneNode(true) as HTMLElement
  for (const element of Array.from(clone.querySelectorAll<HTMLElement>(`[${NODE_ATTR}]`))) {
    element.removeAttribute(NODE_ATTR)
    element.removeAttribute('contenteditable')
    element.style.removeProperty('outline')
    element.style.removeProperty('outline-offset')
    // An element whose only inline style was the ring should not keep an
    // empty style attribute behind.
    if (!element.getAttribute('style')) element.removeAttribute('style')
  }
  return clone.innerHTML
}

/** Clears rings from a design that was saved with them before this was fixed. */
export const stripRings = (root: HTMLElement) => {
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('[style*="outline"]'))) {
    element.style.removeProperty('outline')
    element.style.removeProperty('outline-offset')
  }
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

/** Where a node sits among its siblings, and how many there are. */
export const siblingIndex = (element: HTMLElement) => {
  const parent = element.parentElement
  if (!parent) return { index: 0, total: 1 }
  const siblings = Array.from(parent.children)
  return { index: siblings.indexOf(element), total: siblings.length }
}

/**
 * Moves a node one place among its siblings.
 *
 * Returns the id the caller should reselect. Every id is a positional path, so
 * moving a node changes its own id and its siblings' — the whole tree has to
 * be restamped afterwards, and the selection re-derived rather than kept.
 */
export const moveNode = (element: HTMLElement, direction: -1 | 1): boolean => {
  const parent = element.parentElement
  if (!parent) return false
  const siblings = Array.from(parent.children)
  const index = siblings.indexOf(element)
  const target = index + direction
  if (target < 0 || target >= siblings.length) return false

  if (direction === -1) parent.insertBefore(element, siblings[target])
  else parent.insertBefore(siblings[target], element)
  return true
}

export const duplicateNode = (element: HTMLElement): HTMLElement | null => {
  const parent = element.parentElement
  if (!parent) return null
  const copy = element.cloneNode(true) as HTMLElement
  parent.insertBefore(copy, element.nextSibling)
  return copy
}

/** Nodes whose content is text we can let the user type over in place. */
export const canEditInline = (element: HTMLElement): boolean =>
  element.children.length === 0 &&
  (element.textContent ?? '').trim().length > 0 &&
  !['IMG', 'INPUT', 'SVG', 'BR', 'HR'].includes(element.tagName)

/** A CSS length as {value, unit}, for a control that has to round-trip it. */
export const parseLength = (input: string): { value: number; unit: string } => {
  const match = input.trim().match(/^(-?[\d.]+)(px|%|rem|em|vh|vw)?$/)
  if (!match) return { value: 0, unit: 'auto' }
  return { value: Number.parseFloat(match[1]), unit: match[2] ?? 'px' }
}

/* ------------------------------------------------------------------ *
 * Inserting
 *
 * New nodes are written the way the model writes them — inline styles,
 * referencing the guide through CSS variables — so an inserted element is
 * indistinguishable from a generated one and inherits the design system
 * without any extra plumbing.
 * ------------------------------------------------------------------ */

export type InsertKind = 'heading' | 'text' | 'button' | 'image' | 'box' | 'divider'

const MARKUP: Record<InsertKind, string> = {
  heading:
    '<h2 style="margin:0;font-family:var(--font-family);font-size:32px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;color:var(--foreground);">Heading</h2>',
  text: '<p style="margin:0;font-family:var(--font-family);font-size:16px;line-height:1.6;color:var(--muted-foreground);">Some text. Double-click to type over it.</p>',
  button:
    '<button style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border:none;border-radius:8px;background:var(--primary);color:var(--primary-foreground);font-family:var(--font-family);font-size:14px;font-weight:600;cursor:pointer;">Button</button>',
  // A neutral placeholder rather than a remote URL: an inserted image should
  // render instantly and offline, and the panel replaces it in one click.
  image:
    '<img alt="" style="display:block;width:100%;height:200px;object-fit:cover;border-radius:8px;background:var(--muted);" src="data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="%23d4d4d8"/><path d="M150 130l30-38 24 30 18-22 28 30z" fill="%23a1a1aa"/><circle cx="160" cy="78" r="12" fill="%23a1a1aa"/></svg>',
    ) +
    '">',
  box: '<div style="padding:24px;border-radius:12px;background:var(--card);border:1px solid var(--border);"></div>',
  divider: '<div style="height:1px;width:100%;background:var(--border);"></div>',
}

/**
 * Places a new element after the selection, or at the end of the design when
 * nothing is selected. Returns it so the caller can select what it just made.
 */
export const insertNode = (
  root: HTMLElement,
  kind: InsertKind,
  after: HTMLElement | null,
): HTMLElement | null => {
  const holder = document.createElement('div')
  holder.innerHTML = MARKUP[kind]
  const node = holder.firstElementChild as HTMLElement | null
  if (!node) return null

  if (after?.parentElement) after.parentElement.insertBefore(node, after.nextSibling)
  else root.append(node)
  return node
}
