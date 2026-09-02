/**
 * Working with the nodes of a generated design.
 *
 * The design is HTML with inline styles, so the rendered DOM is the document
 * — there is no parallel model to keep in sync. Editing means mutating a node
 * and reading `innerHTML` back out.
 */

import { COMPONENT_ATTR } from '@/lib/design-model'
import { splitTop } from '@/lib/sanitise'

export { COMPONENT_ATTR }

/** Marks every element so a selection can survive a re-render. */
export const NODE_ATTR = 'data-mason-id'

/**
 * What the layer tree records about a node.
 *
 * Written onto the element rather than held in React state, for the same
 * reason every other edit is: the rendered DOM is the document, so a name, a
 * hidden layer and a locked layer survive a save and a reload without a
 * second model to keep in step with the first.
 */
export const NAME_ATTR = 'data-mason-name'
/** Present when hidden. Its value is the inline `display` it replaced. */
export const HIDDEN_ATTR = 'data-mason-hidden'
export const LOCKED_ATTR = 'data-mason-locked'

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
      // The index still counts what is skipped, so an id stays a true child
      // path and restamping lands on the same nodes.
      if (UNSTAMPED.has(child.tagName)) return
      walk(child, path ? `${path}.${index}` : String(index))
    })
  }
  Array.from(root.children).forEach((child, index) => {
    if (UNSTAMPED.has(child.tagName)) return
    walk(child, String(index))
  })
}

/**
 * Elements that are in the markup but are not part of the design.
 *
 * A generated design carries its own stylesheet, and stamping it made it a
 * layer: it sat at the top of the tree labelled with its own CSS, filled a
 * slot in the AI panel's section list, and could be selected and deleted —
 * which strips every hover, focus state and breakpoint the design has, with
 * nothing on screen to say what just happened.
 */
const UNSTAMPED = new Set(['STYLE', 'SCRIPT', 'LINK', 'META', 'TITLE'])

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

/**
 * One node's markup, without the editor's bookkeeping.
 *
 * What the inspector's code view shows and what it accepts back: the ids are
 * positional and are restamped after any change, so showing them would be
 * showing something the user must not edit.
 */
export const nodeMarkup = (element: HTMLElement): string => {
  const clone = element.cloneNode(true) as HTMLElement
  for (const node of [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]) {
    node.removeAttribute(NODE_ATTR)
    node.removeAttribute('contenteditable')
  }
  return clone.outerHTML
}

/**
 * Where a node sits, in one line the model can read.
 *
 * `section.dark (background:#111) > div.grid-3 (display:grid; gap:24px) > [this]`
 *
 * A node edit sends one element, and the model has to guess what surrounds
 * it: whether it is one card of three in a grid, whether the section behind it
 * is dark, whether it is the page root. Guessing wrong is what put
 * `width:100%` and the page background on a card. The chain is read from the
 * `style` attribute rather than the computed style, so it says what the design
 * authored and nothing the editor's own stylesheet added.
 */
export const describeAncestors = (element: HTMLElement, root: HTMLElement): string => {
  const HINTS = ['display', 'gap', 'background', 'background-color']
  const chain: string[] = []

  for (let node = element.parentElement; node && node !== root; node = node.parentElement) {
    const classes = Array.from(node.classList)
      .map((name) => `.${name}`)
      .join('')
    const style = node.getAttribute('style') ?? ''
    const hints = HINTS.flatMap((property) => {
      const match = style.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i'))
      const value = match?.[1]?.trim()
      // A gradient or a data URL runs to hundreds of characters; the model
      // only needs to know the surface is painted.
      return value ? [`${property}:${value.length > 60 ? `${value.slice(0, 60)}…` : value}`] : []
    })
    const tag = node.tagName.toLowerCase()
    chain.unshift(hints.length ? `${tag}${classes} (${hints.join('; ')})` : `${tag}${classes}`)
  }

  return [...chain, '[this]'].join(' > ')
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
  const given = element.getAttribute(NAME_ATTR)?.trim()
  if (given) return given

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

/**
 * Elements that are part of a run of text rather than a break in it.
 *
 * `contenteditable` handles these natively, so a heading containing them is
 * still one piece of text to type over.
 */
const INLINE_CONTENT = new Set([
  'BR', 'SPAN', 'STRONG', 'EM', 'B', 'I', 'U', 'S', 'SMALL', 'MARK', 'CODE', 'SUB', 'SUP',
])

const NEVER_EDITABLE = ['IMG', 'INPUT', 'SVG', 'BR', 'HR']

/**
 * Nodes whose content is text we can let the user type over in place.
 *
 * The rule used to be "no element children at all", which quietly refused the
 * commonest heading there is — one with a `<br>` in it — and refused it with
 * no feedback, so double-clicking a two-line headline did nothing. What makes
 * typing unsafe is a *structural* child, where editing would swallow a
 * subtree; a line break or a bold run is part of the same sentence.
 */
export const canEditInline = (element: HTMLElement): boolean =>
  !NEVER_EDITABLE.includes(element.tagName) &&
  (element.textContent ?? '').trim().length > 0 &&
  Array.from(element.querySelectorAll('*')).every((node) => INLINE_CONTENT.has(node.tagName))

/**
 * The element whose children are the page's sections.
 *
 * A generated design is almost always one wrapper holding everything, so
 * reading the stage's own children offers a single destination called "Group"
 * — which defeats addressing a section by name entirely.
 *
 * Exactly one level, and only past a wrapper that holds something. Descending
 * further would start listing the cards inside a section, which is an
 * inventory rather than a set of destinations, and a chain of single wrappers
 * would walk all the way to a leaf. This is the same reading the project
 * export uses to find where a page's sections begin.
 */
export const sectionScope = (root: HTMLElement): HTMLElement => {
  const stamped = (element: HTMLElement) =>
    Array.from(element.children).filter((child) => child.hasAttribute(NODE_ATTR))

  const children = stamped(root)
  return children.length === 1 && stamped(children[0] as HTMLElement).length > 0
    ? (children[0] as HTMLElement)
    : root
}

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

/* ------------------------------------------------------------------ *
 * Containers
 *
 * A generated design is a flow layout: some elements arrange children and some
 * are the children. The editor has to tell them apart, because dropping a card
 * into a nav — which is what happens when any node under the pointer is
 * accepted — rearranges the page rather than the element.
 * ------------------------------------------------------------------ */

/**
 * Elements that hold content rather than layout.
 *
 * A button contains a label, not a section. Inserting a sibling inside one is
 * always a mistake even when it is geometrically where the pointer was.
 */
const LEAF_TAGS = new Set([
  'BUTTON', 'A', 'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'IMG', 'SVG', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL', 'LI', 'TD', 'TH',
  'STRONG', 'EM', 'SMALL', 'CODE', 'TIME', 'SUMMARY',
])

/** Is this element in the business of arranging children at all? */
const arrangesChildren = (element: HTMLElement): boolean => {
  if (LEAF_TAGS.has(element.tagName)) return false

  const display = getComputedStyle(element).display
  // Inline boxes do not arrange block children in any useful way, and an
  // element displaying nothing cannot be dropped into at all.
  return display !== 'inline' && display !== 'none' && display !== 'contents'
}

/** Can this element genuinely arrange a new child? */
export const canHostChildren = (element: HTMLElement): boolean =>
  // A container with no element children is usually a spacer or a decorative
  // box rather than somewhere content belongs. ^[inferred]
  arrangesChildren(element) && element.children.length > 0

/**
 * The layer tree's version of the same question.
 *
 * Looser by one case: an empty box is refused on the canvas because a drop
 * there is a guess made from a pointer position, and a spacer is the likeliest
 * thing under the pointer. Dropping a row onto a row in the tree is not a
 * guess — it names its destination — so an empty container is somewhere you
 * are allowed to put the first thing in it.
 */
export const canAcceptDrop = (element: HTMLElement): boolean => arrangesChildren(element)

/**
 * Does this container lay its children out along the horizontal axis?
 *
 * Decides which edge of a target counts as "before", and whether the drop
 * indicator is a vertical bar or a horizontal one. Judging a row by the
 * pointer's Y position puts the element on the wrong side about half the time.
 */
export const isRowLayout = (container: HTMLElement): boolean => {
  const style = getComputedStyle(container)

  if (style.display === 'flex' || style.display === 'inline-flex') {
    return style.flexDirection === 'row' || style.flexDirection === 'row-reverse'
  }

  if (style.display === 'grid' || style.display === 'inline-grid') {
    // More than one column means children sit beside each other.
    return style.gridTemplateColumns.split(' ').filter(Boolean).length > 1
  }

  return false
}

/* ------------------------------------------------------------------ *
 * Layers
 *
 * The tree is derived from the DOM every time it is read rather than kept
 * alongside it. Ids are positional paths, so a node's ancestors are its own
 * id's prefixes and nothing has to be threaded through the walk to know where
 * a row sits.
 * ------------------------------------------------------------------ */

export const isHidden = (element: HTMLElement): boolean => element.hasAttribute(HIDDEN_ATTR)

/**
 * Hiding writes `display: none` rather than dimming the node in the editor,
 * so a hidden layer is hidden everywhere the design renders — the preview, a
 * share link, the exported file. The attribute doubles as the memory of the
 * inline display it replaced, so showing it again restores what was there
 * instead of guessing at `block`.
 */
export const setHidden = (element: HTMLElement, hidden: boolean) => {
  if (hidden === isHidden(element)) return
  if (hidden) {
    element.setAttribute(HIDDEN_ATTR, element.style.display)
    element.style.setProperty('display', 'none')
    return
  }
  const previous = element.getAttribute(HIDDEN_ATTR) ?? ''
  element.removeAttribute(HIDDEN_ATTR)
  if (previous) element.style.setProperty('display', previous)
  else element.style.removeProperty('display')
}

export const isLocked = (element: HTMLElement): boolean => element.hasAttribute(LOCKED_ATTR)

export const setLocked = (element: HTMLElement, locked: boolean) => {
  if (locked) element.setAttribute(LOCKED_ATTR, '')
  else element.removeAttribute(LOCKED_ATTR)
}

/**
 * The lock covering a node, which may be the node itself or anything above it.
 *
 * A lock has to cover the subtree or it does not mean much: locking a section
 * you have finished with, only to keep catching the headline inside it, is the
 * same as not locking it.
 */
export const lockedAncestor = (
  element: HTMLElement,
  root: HTMLElement,
): HTMLElement | null => {
  let node: HTMLElement | null = element
  while (node && node !== root) {
    if (isLocked(node)) return node
    node = node.parentElement
  }
  return null
}

/* ------------------------------------------------------------------ *
 * Components
 *
 * A component is a subtree with a name on it. Instances are copies carrying
 * the same name — there is no main and no override model, because the design
 * is a live DOM and an override that survives regeneration would need an
 * identity that positional ids deliberately do not have.
 *
 * What that buys: the project export emits one file per name and references it
 * everywhere it appears, and a change can be pushed across the instances when
 * the user asks for it rather than while they are still editing.
 * ------------------------------------------------------------------ */

export const componentName = (element: HTMLElement): string | null =>
  element.getAttribute(COMPONENT_ATTR)?.trim() || null

export const setComponentName = (element: HTMLElement, name: string) => {
  const trimmed = name.trim().slice(0, 40)
  if (trimmed) element.setAttribute(COMPONENT_ATTR, trimmed)
  else element.removeAttribute(COMPONENT_ATTR)
}

/** The component a node belongs to, which may be the node itself. */
export const componentAncestor = (
  element: HTMLElement,
  root: HTMLElement,
): HTMLElement | null => {
  let node: HTMLElement | null = element
  while (node && node !== root) {
    if (componentName(node)) return node
    node = node.parentElement
  }
  return null
}

export const instancesOf = (root: HTMLElement, name: string): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(`[${COMPONENT_ATTR}]`)).filter(
    (node) => componentName(node) === name,
  )

/** Every distinct component in the design, with how many instances it has. */
export const componentsIn = (root: HTMLElement): { name: string; count: number }[] => {
  const counts = new Map<string, number>()
  for (const node of Array.from(root.querySelectorAll<HTMLElement>(`[${COMPONENT_ATTR}]`))) {
    const name = componentName(node)
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return Array.from(counts, ([name, count]) => ({ name, count }))
}

/**
 * Makes every other instance look like this one.
 *
 * Deliberate rather than continuous. Editing one instance and having the other
 * six change under you is the behaviour people turn components off to avoid,
 * and it cannot be undone selectively once the design is only a DOM. Asking
 * for it is one undo step; not asking for it leaves the instances alone.
 *
 * Returns how many were changed, which is the only honest thing to report —
 * "pushed" with no number could mean nothing happened.
 */
export const pushToInstances = (root: HTMLElement, source: HTMLElement): number => {
  const name = componentName(source)
  if (!name) return 0

  const others = instancesOf(root, name).filter(
    // A component nested inside itself is not a thing anybody meant to build,
    // and replacing an ancestor with its own descendant destroys the tree.
    (node) => node !== source && !node.contains(source) && !source.contains(node),
  )

  for (const other of others) other.replaceWith(source.cloneNode(true) as HTMLElement)
  return others.length
}

/** Renames a layer, or clears the name so the generated label comes back. */
export const renameNode = (element: HTMLElement, name: string) => {
  const trimmed = name.trim().slice(0, 60)
  if (trimmed) element.setAttribute(NAME_ATTR, trimmed)
  else element.removeAttribute(NAME_ATTR)
}

/** `0.2.1` → `['0', '0.2']`. */
export const ancestorIds = (id: string): string[] => {
  const parts = id.split('.')
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('.'))
}

export type LayerRow = {
  id: string
  depth: number
  label: string
  hasChildren: boolean
  open: boolean
  hidden: boolean
  locked: boolean
  /** The component this row is, when it is one. */
  component: string | null
  /** Set when the state comes from an ancestor, which the row cannot undo. */
  hiddenAbove: boolean
  lockedAbove: boolean
}

/**
 * The visible rows of the tree.
 *
 * Only expanded nodes are descended into, which is what makes a nested tree
 * usable where the old flat list capped itself at five levels and showed
 * everything under them regardless.
 */
export const buildLayerRows = (root: HTMLElement, expanded: Set<string>): LayerRow[] => {
  const rows: LayerRow[] = []

  const walk = (element: Element, depth: number, hiddenAbove: boolean, lockedAbove: boolean) => {
    const id = element.getAttribute(NODE_ATTR)
    if (!id) return
    const node = element as HTMLElement
    const hasChildren = node.children.length > 0
    const open = hasChildren && expanded.has(id)
    const hidden = isHidden(node)
    const locked = isLocked(node)

    rows.push({
      id,
      depth,
      label: labelFor(node),
      hasChildren,
      open,
      hidden,
      locked,
      component: componentName(node),
      hiddenAbove,
      lockedAbove,
    })

    if (!open) return
    for (const child of Array.from(node.children)) {
      walk(child, depth + 1, hiddenAbove || hidden, lockedAbove || locked)
    }
  }

  for (const child of Array.from(root.children)) walk(child, 0, false, false)
  return rows
}

/**
 * What is open when a design is first painted: the outermost two levels.
 *
 * A generated design is usually one wrapper holding a handful of sections, so
 * opening only the root would show a single row and opening everything would
 * show several hundred.
 */
export const defaultExpanded = (root: HTMLElement): Set<string> => {
  const ids = Array.from(root.querySelectorAll<HTMLElement>(`[${NODE_ATTR}]`))
    .map((node) => node.getAttribute(NODE_ATTR) ?? '')
    .filter((id) => id && id.split('.').length <= 2)
  return new Set(ids)
}

export type DropWhere = 'before' | 'after' | 'inside'

/**
 * Refuses rather than corrupts: a node cannot be dropped into itself or into
 * anything it contains, and `inside` is only accepted by a container that can
 * hold a child.
 *
 * Asked before the move so the caller can decline without having taken an
 * undo snapshot for something that never happened.
 */
export const canDropLayer = (
  moving: HTMLElement,
  target: HTMLElement,
  where: DropWhere,
): boolean => {
  if (moving === target || moving.contains(target)) return false
  return where === 'inside' ? canAcceptDrop(target) : target.parentElement !== null
}

/** Moves a node to where a layer was dropped. */
export const dropLayer = (
  moving: HTMLElement,
  target: HTMLElement,
  where: DropWhere,
): boolean => {
  if (!canDropLayer(moving, target, where)) return false

  if (where === 'inside') target.append(moving)
  else target.parentElement?.insertBefore(moving, where === 'before' ? target : target.nextSibling)
  return true
}

/* ------------------------------------------------------------------ *
 * Writing style
 *
 * The inspector's controls mostly write one property, but the interesting ones
 * write several at once — a fixed width on a flex child is three declarations,
 * not one. They are expressed as lists of writes so the panel can apply them
 * under a single undo step, and so the rules can be tested without a panel.
 * ------------------------------------------------------------------ */

export type StyleWrite = [property: string, value: string]

/** Applies a set of writes. An empty value clears the property. */
export const applyWrites = (element: HTMLElement, writes: StyleWrite[]) => {
  for (const [property, value] of writes) {
    if (value === '') element.style.removeProperty(property)
    else element.style.setProperty(property, value)
  }
}

export type Axis = 'horizontal' | 'vertical'

/** The axis this node's parent arranges its children along, if it arranges. */
export const parentAxis = (element: HTMLElement): Axis | null => {
  const parent = element.parentElement
  if (!parent) return null
  const display = getComputedStyle(parent).display
  if (display !== 'flex' && display !== 'inline-flex') return null
  return isRowLayout(parent) ? 'horizontal' : 'vertical'
}

const alongParent = (element: HTMLElement, axis: 'width' | 'height') =>
  parentAxis(element) === (axis === 'width' ? 'horizontal' : 'vertical')

/**
 * Giving a node a size.
 *
 * `width: 240px` on a flex child does close to nothing: flex-basis wins over
 * width, and a sibling with `flex: 1` takes the space back on the next layout
 * pass — so dragging a handle either did not move the element or moved it and
 * left the row broken. Along the parent's main axis a fixed size is a basis
 * the container is told not to grow or shrink; across it, width and height
 * mean what they say.
 *
 * The plain property is written too, so the size still reads as a size if the
 * parent later stops being a flex container.
 */
export const sizeWrites = (
  element: HTMLElement,
  axis: 'width' | 'height',
  value: string,
): StyleWrite[] => {
  if (!alongParent(element, axis)) return [[axis, value]]
  if (value === '' || value === 'auto') {
    return [
      [axis, value],
      ['flex-grow', ''],
      ['flex-shrink', ''],
      ['flex-basis', ''],
    ]
  }
  return [
    [axis, value],
    ['flex-grow', '0'],
    ['flex-shrink', '0'],
    ['flex-basis', value],
  ]
}

/** Taking whatever space the parent has left, on one axis. */
export const fillWrites = (element: HTMLElement, axis: 'width' | 'height'): StyleWrite[] => {
  if (alongParent(element, axis)) {
    return [
      [axis, 'auto'],
      ['flex-grow', '1'],
      ['flex-shrink', '1'],
      ['flex-basis', '0'],
    ]
  }
  // Across a flex parent's axis, stretching is the whole mechanism; a
  // percentage would be measured against a container that has no size of its
  // own on that axis.
  if (parentAxis(element)) {
    return [
      [axis, 'auto'],
      ['align-self', 'stretch'],
    ]
  }
  return [[axis, '100%']]
}

export const isFilling = (element: HTMLElement, axis: 'width' | 'height'): boolean => {
  if (alongParent(element, axis)) {
    return (Number.parseFloat(readStyle(element, 'flex-grow')) || 0) > 0
  }
  // Read from the inline style rather than the computed one: `align-self:
  // auto` resolves against the parent, so a computed read would report every
  // child of a stretching container as filling deliberately.
  if (parentAxis(element)) return element.style.alignSelf === 'stretch'
  return element.style.getPropertyValue(axis) === '100%'
}

/**
 * Aligning a node within its parent.
 *
 * Two different mechanisms wearing one label. Across a flex parent's axis the
 * child says where it sits with `align-self`; along it — and in ordinary block
 * flow — the only thing that moves a single child is an auto margin. Vertical
 * alignment inside a block parent has no expression at all, so it returns
 * nothing rather than writing something that does not work.
 */
export const alignWrites = (
  element: HTMLElement,
  axis: Axis,
  position: 'start' | 'center' | 'end',
): StyleWrite[] => {
  const main = parentAxis(element)

  if (main !== null && main !== axis) {
    const value =
      position === 'start' ? 'flex-start' : position === 'end' ? 'flex-end' : 'center'
    return [['align-self', value]]
  }

  if (main === null && axis === 'vertical') return []

  const [before, after] =
    axis === 'horizontal' ? ['margin-left', 'margin-right'] : ['margin-top', 'margin-bottom']
  return [
    [before, position === 'start' ? '0' : 'auto'],
    [after, position === 'end' ? '0' : 'auto'],
  ]
}

/** Which alignment button should read as active, if any. */
export const alignmentOf = (
  element: HTMLElement,
  axis: Axis,
): 'start' | 'center' | 'end' | null => {
  const main = parentAxis(element)

  if (main !== null && main !== axis) {
    const self = element.style.alignSelf
    if (self === 'center') return 'center'
    if (self === 'flex-start' || self === 'start') return 'start'
    if (self === 'flex-end' || self === 'end') return 'end'
    return null
  }

  if (main === null && axis === 'vertical') return null

  const [before, after] =
    axis === 'horizontal' ? ['margin-left', 'margin-right'] : ['margin-top', 'margin-bottom']
  const beforeAuto = element.style.getPropertyValue(before) === 'auto'
  const afterAuto = element.style.getPropertyValue(after) === 'auto'
  if (beforeAuto && afterAuto) return 'center'
  if (afterAuto) return 'start'
  if (beforeAuto) return 'end'
  return null
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

export type LayoutMode = 'block' | 'row' | 'column' | 'grid'

export const layoutMode = (element: HTMLElement): LayoutMode => {
  const display = readStyle(element, 'display')
  if (display.includes('grid')) return 'grid'
  if (!display.includes('flex')) return 'block'
  return readStyle(element, 'flex-direction').startsWith('column') ? 'column' : 'row'
}

/**
 * Changing how a container arranges its children.
 *
 * Going back to `block` clears the properties flex added rather than setting
 * them to their initial values, so the container falls back to whatever its
 * tag and the design's own stylesheet say — which is where it started.
 */
export const layoutWrites = (mode: 'block' | 'row' | 'column'): StyleWrite[] =>
  mode === 'block'
    ? [
        ['display', ''],
        ['flex-direction', ''],
        ['align-items', ''],
        ['justify-content', ''],
        ['flex-wrap', ''],
      ]
    : [
        ['display', 'flex'],
        ['flex-direction', mode],
      ]

const FLEX_POSITION: Record<'start' | 'center' | 'end', string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
}

/**
 * Where a container puts its children, as a point on a nine-square pad.
 *
 * The pad is read in screen terms — left/centre/right and top/middle/bottom —
 * and which CSS property carries which of them swaps with the direction. A pad
 * that wrote `justify-content` for horizontal regardless would move children
 * up and down in a column.
 */
export const containerAlignWrites = (
  element: HTMLElement,
  horizontal: 'start' | 'center' | 'end',
  vertical: 'start' | 'center' | 'end',
): StyleWrite[] =>
  layoutMode(element) === 'column'
    ? [
        ['align-items', FLEX_POSITION[horizontal]],
        ['justify-content', FLEX_POSITION[vertical]],
      ]
    : [
        ['justify-content', FLEX_POSITION[horizontal]],
        ['align-items', FLEX_POSITION[vertical]],
      ]

const readPosition = (value: string): 'start' | 'center' | 'end' => {
  if (value.includes('center')) return 'center'
  if (value.includes('end') || value.includes('right') || value.includes('bottom')) return 'end'
  return 'start'
}

export const containerAlignment = (
  element: HTMLElement,
): { horizontal: 'start' | 'center' | 'end'; vertical: 'start' | 'center' | 'end' } => {
  const justify = readPosition(readStyle(element, 'justify-content'))
  const items = readPosition(readStyle(element, 'align-items'))
  return layoutMode(element) === 'column'
    ? { horizontal: items, vertical: justify }
    : { horizontal: justify, vertical: items }
}

export const SIDES = ['top', 'right', 'bottom', 'left'] as const
export const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const

const pixels = (value: string) => Math.round(Number.parseFloat(value) || 0)

/** Padding or margin as four numbers, in CSS order. */
export const readSides = (element: HTMLElement, property: 'padding' | 'margin'): number[] =>
  SIDES.map((side) => pixels(readStyle(element, `${property}-${side}`)))

export const readCorners = (element: HTMLElement): number[] =>
  CORNERS.map((corner) => pixels(readStyle(element, `border-${corner}-radius`)))

/* ------------------------------------------------------------------ *
 * Rotation
 * ------------------------------------------------------------------ */

/**
 * Reads a rotation from the inline transform, falling back to decomposing the
 * computed matrix — a design whose stylesheet rotates something would
 * otherwise show 0° next to a visibly tilted element.
 */
export const readRotation = (element: HTMLElement): number => {
  const inline = /rotate\(\s*(-?[\d.]+)deg\s*\)/.exec(element.style.transform ?? '')
  if (inline) return Number.parseFloat(inline[1])

  const matrix = /matrix\(([^)]+)\)/.exec(readStyle(element, 'transform'))
  if (!matrix) return 0
  const [a, b] = matrix[1].split(',').map((part) => Number.parseFloat(part))
  return Math.round((Math.atan2(b || 0, a || 1) * 180) / Math.PI)
}

/** Replaces the rotation in a transform, leaving anything else it does alone. */
export const withRotation = (transform: string, degrees: number): string => {
  const rest = (transform || '')
    .replace(/rotate\(\s*-?[\d.]+deg\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!degrees) return rest
  return rest ? `${rest} rotate(${degrees}deg)` : `rotate(${degrees}deg)`
}

/* ------------------------------------------------------------------ *
 * Fills, strokes and effects
 *
 * Three properties that are genuinely lists and were being shown as single
 * values. A card has a shadow and a ring; a hero has a photograph under a
 * gradient over a colour. An inspector with one shadow field cannot describe
 * either without destroying the other layers on the way past.
 * ------------------------------------------------------------------ */

const COLOUR = /rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8}/i

export type Shadow = {
  x: number
  y: number
  blur: number
  spread: number
  colour: string
  inset: boolean
}

const parseShadow = (input: string): Shadow | null => {
  const inset = /\binset\b/.test(input)
  let rest = input.replace(/\binset\b/g, ' ')

  const found = COLOUR.exec(rest)
  const colour = found ? found[0] : 'rgba(0, 0, 0, 0.25)'
  if (found) rest = rest.replace(found[0], ' ')

  const numbers = rest
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => Number.parseFloat(token) || 0)
  if (numbers.length === 0) return null

  const [x = 0, y = 0, blur = 0, spread = 0] = numbers
  return { x, y, blur, spread, colour, inset }
}

export const readShadows = (element: HTMLElement): Shadow[] => {
  const value = readStyle(element, 'box-shadow').trim()
  if (!value || value === 'none') return []
  return splitTop(value, ',')
    .map((part) => parseShadow(part.trim()))
    .filter((shadow): shadow is Shadow => shadow !== null)
}

export const writeShadows = (shadows: Shadow[]): string =>
  shadows.length === 0
    ? 'none'
    : shadows
        .map(
          (shadow) =>
            `${shadow.inset ? 'inset ' : ''}${shadow.x}px ${shadow.y}px ${shadow.blur}px ` +
            `${shadow.spread}px ${shadow.colour}`,
        )
        .join(', ')

export const NEW_SHADOW: Shadow = {
  x: 0,
  y: 4,
  blur: 12,
  spread: 0,
  colour: 'rgba(0, 0, 0, 0.15)',
  inset: false,
}

/** The background layers painted over the background colour, outermost first. */
export const readFillLayers = (element: HTMLElement): string[] => {
  const value = readStyle(element, 'background-image').trim()
  if (!value || value === 'none') return []
  return splitTop(value, ',')
    .map((layer) => layer.trim())
    .filter((layer) => layer && layer !== 'none')
}

export const writeFillLayers = (layers: string[]): string =>
  layers.length === 0 ? 'none' : layers.join(', ')

export type Gradient = { angle: number; from: string; to: string }

const colourOf = (stop: string) => COLOUR.exec(stop)?.[0] ?? stop.trim()

/**
 * A two-stop linear gradient, when the layer happens to be one.
 *
 * Anything richer — three stops, a radial, a photograph — comes back null and
 * is shown as the CSS it is rather than flattened into controls that would
 * throw the rest of it away on the first edit.
 */
export const parseGradient = (layer: string): Gradient | null => {
  // [\s\S] rather than the `s` flag: the build targets a version that predates
  // it, and a gradient written across two lines still has to parse.
  const match = /^linear-gradient\(([\s\S]*)\)$/i.exec(layer.trim())
  if (!match) return null

  const parts = splitTop(match[1], ',').map((part) => part.trim())
  const angle = /^(-?[\d.]+)deg$/.exec(parts[0])

  if (angle && parts.length === 3) {
    return { angle: Number.parseFloat(angle[1]), from: colourOf(parts[1]), to: colourOf(parts[2]) }
  }
  // A computed gradient drops the direction when it is the default one.
  if (!angle && parts.length === 2) {
    return { angle: 180, from: colourOf(parts[0]), to: colourOf(parts[1]) }
  }
  return null
}

export const formatGradient = (gradient: Gradient): string =>
  `linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})`

export type Stroke = {
  /** `all` while the four sides agree, which is how borders are usually set. */
  sides: 'all' | (typeof SIDES)[number]
  width: number
  style: string
  colour: string
}

export const readStrokes = (element: HTMLElement): Stroke[] => {
  const present = SIDES.map((side) => ({
    side,
    width: pixels(readStyle(element, `border-${side}-width`)),
    style: readStyle(element, `border-${side}-style`) || 'none',
    colour: toHex(readStyle(element, `border-${side}-color`)),
  })).filter((edge) => edge.width > 0 && edge.style !== 'none')

  if (present.length === 0) return []

  const [first] = present
  const uniform =
    present.length === SIDES.length &&
    present.every(
      (edge) =>
        edge.width === first.width && edge.style === first.style && edge.colour === first.colour,
    )

  if (uniform) {
    return [{ sides: 'all', width: first.width, style: first.style, colour: first.colour }]
  }
  return present.map((edge) => ({
    sides: edge.side,
    width: edge.width,
    style: edge.style,
    colour: edge.colour,
  }))
}

const strokePrefix = (stroke: Pick<Stroke, 'sides'>) =>
  stroke.sides === 'all' ? 'border' : `border-${stroke.sides}`

export const strokeWrites = (stroke: Stroke): StyleWrite[] => [
  [`${strokePrefix(stroke)}-width`, `${stroke.width}px`],
  [`${strokePrefix(stroke)}-style`, stroke.style],
  [`${strokePrefix(stroke)}-color`, stroke.colour],
]

export const removeStrokeWrites = (stroke: Stroke): StyleWrite[] => [
  [`${strokePrefix(stroke)}-width`, '0'],
  [`${strokePrefix(stroke)}-style`, 'none'],
]

export const NEW_STROKE: Stroke = { sides: 'all', width: 1, style: 'solid', colour: '#000000' }
