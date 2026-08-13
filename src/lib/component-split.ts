/**
 * Finding the components inside a section.
 *
 * Splitting a page into one file per section is the easy half, and on its own
 * it produces the thing people complain about: a `Services.tsx` containing the
 * same card written out three times with different words in it. A design's
 * real components are the shapes that repeat — the nav link, the pricing card,
 * the feature tile — and what varies between their instances is content, not
 * structure.
 *
 * So a repeat is found by structure, and everything that differs across the
 * instances becomes a prop. `<a>` four times over with four different labels
 * and four different hrefs is one `NavLink` taking a label and an href, which
 * is what somebody would have written by hand.
 */

/** Elements that are in the markup but are not content. */
const NOT_CONTENT = new Set(['STYLE', 'SCRIPT', 'LINK', 'META', 'TITLE'])

export const contentChildren = (element: Element): HTMLElement[] =>
  Array.from(element.children).filter((child) => !NOT_CONTENT.has(child.tagName)) as HTMLElement[]

/**
 * What an element is, ignoring what it says.
 *
 * Tag, classes and inline style, recursively through the children. Text is
 * deliberately absent: two cards that differ only in their words are the same
 * component, and that is the entire point.
 */
const signature = (element: Element): string => {
  const classes = (element.getAttribute('class') ?? '').trim()
  const style = (element.getAttribute('style') ?? '').trim()
  const children = contentChildren(element).map(signature).join('')
  return `<${element.tagName}|${classes}|${style}|${children}>`
}

/** The element's own words, ignoring any belonging to its children. */
const directText = (element: Element): string =>
  Array.from(element.childNodes)
    .filter((node) => node.nodeType === 3)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim()

/** Attributes worth turning into a prop when they differ. */
const VARIABLE_ATTRS = ['href', 'src', 'alt', 'title', 'aria-label'] as const

/**
 * A structural name, never one taken from an instance.
 *
 * The first card's heading is "Fast", and naming the shared component `Fast`
 * would be naming it after one of the three things it stands for.
 */
const structuralName = (element: HTMLElement): string => {
  const tag = element.tagName
  if (tag === 'A') return element.closest('nav') ? 'NavLink' : 'LinkItem'
  if (tag === 'BUTTON') return 'ActionButton'
  if (tag === 'LI') return 'ListItem'

  const hasHeading = element.querySelector('h1, h2, h3, h4, h5, h6') !== null
  const hasImage = element.querySelector('img, svg') !== null
  if (hasHeading && hasImage) return 'MediaCard'
  if (hasHeading) return 'FeatureCard'
  if (hasImage) return 'ImageCard'
  return 'Card'
}

/** A prop name that says what the slot is, from the element holding it. */
const propName = (element: HTMLElement, attribute?: string): string => {
  if (attribute) return attribute === 'aria-label' ? 'ariaLabel' : attribute
  const tag = element.tagName
  if (/^H[1-6]$/.test(tag)) return 'title'
  if (tag === 'P') return 'body'
  if (tag === 'A' || tag === 'BUTTON') return 'label'
  if (tag === 'SUP' || tag === 'SMALL') return 'note'
  return 'text'
}

export type Extraction = {
  name: string
  /** The instance the component is written from. */
  template: HTMLElement
  /** Elements in the template whose text is replaced by a prop. */
  textSlots: Map<Element, string>
  /** Elements in the template whose attribute is replaced by a prop. */
  attrSlots: Map<Element, Record<string, string>>
  /** Every prop, in the order they appear. */
  props: string[]
  /** What each instance passes. */
  instances: Map<HTMLElement, Record<string, string>>
}

/** Visits the same position in every instance at once. */
const inLockstep = (nodes: HTMLElement[], visit: (nodes: HTMLElement[]) => void) => {
  visit(nodes)
  const children = nodes.map(contentChildren)
  const shared = Math.min(...children.map((list) => list.length))
  for (let index = 0; index < shared; index += 1) {
    inLockstep(
      children.map((list) => list[index]),
      visit,
    )
  }
}

/**
 * Turns a run of structurally identical siblings into one component.
 *
 * Returns null when the group has nothing that varies *and* nothing that
 * justifies a file — a component is only worth extracting if it either says
 * something different each time or is a real, named part of the page.
 */
const extract = (nodes: HTMLElement[], name: string): Extraction => {
  const textSlots = new Map<Element, string>()
  const attrSlots = new Map<Element, Record<string, string>>()
  const props: string[] = []
  const values = nodes.map(() => ({}) as Record<string, string>)

  const claim = (base: string): string => {
    if (!props.includes(base)) {
      props.push(base)
      return base
    }
    let index = 2
    while (props.includes(`${base}${index}`)) index += 1
    props.push(`${base}${index}`)
    return `${base}${index}`
  }

  inLockstep(nodes, (matched) => {
    const [template] = matched

    // Text, but only where the element has no element children of its own —
    // replacing the text of a wrapper would swallow whatever is inside it.
    if (contentChildren(template).length === 0) {
      const texts = matched.map(directText)
      if (texts.some((text) => text !== texts[0]) && texts.some(Boolean)) {
        const prop = claim(propName(template))
        textSlots.set(template, prop)
        matched.forEach((node, index) => {
          values[index][prop] = directText(node)
        })
      }
    }

    for (const attribute of VARIABLE_ATTRS) {
      const found = matched.map((node) => node.getAttribute(attribute))
      if (found.every((value) => value === null)) continue
      if (found.every((value) => value === found[0])) continue

      const prop = claim(propName(template, attribute))
      attrSlots.set(template, { ...(attrSlots.get(template) ?? {}), [attribute]: prop })
      matched.forEach((node, index) => {
        values[index][prop] = node.getAttribute(attribute) ?? ''
      })
    }
  })

  return {
    name,
    template: nodes[0],
    textSlots,
    attrSlots,
    props,
    instances: new Map(nodes.map((node, index) => [node, values[index]])),
  }
}

/**
 * Is this repeat worth a file of its own?
 *
 * Two `<span>`s side by side are not a component, they are two spans. What
 * earns a file is a shape with some structure to it, or a control — a button
 * repeated three times is a component even though it holds nothing but a word.
 */
const worthExtracting = (node: HTMLElement): boolean => {
  if (node.tagName === 'BUTTON' || node.tagName === 'A') return true
  return contentChildren(node).length > 0
}

/**
 * Every repeated shape inside a subtree, outermost first.
 *
 * Outermost first matters: a card containing a button should become one card
 * component, not a card component whose insides have already been hollowed out
 * into a button component. Once a group is taken, nothing inside it is
 * considered again.
 */
export const findRepeats = (
  root: HTMLElement,
  claimName: (base: string) => string,
): Extraction[] => {
  const found: Extraction[] = []
  const consumed = new Set<Element>()

  const queue: HTMLElement[] = [root]
  while (queue.length > 0) {
    const parent = queue.shift()!
    if (consumed.has(parent)) continue

    const groups = new Map<string, HTMLElement[]>()
    for (const child of contentChildren(parent)) {
      const key = signature(child)
      groups.set(key, [...(groups.get(key) ?? []), child])
    }

    for (const nodes of groups.values()) {
      if (nodes.length < 2 || !worthExtracting(nodes[0])) {
        // Not a repeat, so look inside it for one.
        queue.push(...nodes.filter((node) => !consumed.has(node)))
        continue
      }

      const extraction = extract(nodes, claimName(structuralName(nodes[0])))
      found.push(extraction)
      for (const node of nodes) {
        consumed.add(node)
        for (const descendant of Array.from(node.querySelectorAll('*'))) {
          consumed.add(descendant)
        }
      }
    }
  }

  return found
}

/** The JSX that stands in for an instance: `<NavLink label="Home" … />`. */
export const referenceFor = (
  extraction: Extraction,
  instance: HTMLElement,
  quote: (value: string) => string,
): string => {
  const values = extraction.instances.get(instance) ?? {}
  const props = extraction.props
    .map((prop) => `${prop}=${quote(values[prop] ?? '')}`)
    .join(' ')
  return props ? `<${extraction.name} ${props} />` : `<${extraction.name} />`
}
