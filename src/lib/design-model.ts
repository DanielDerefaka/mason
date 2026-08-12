import { primaryFamily } from '@/lib/fonts'
import type { Shape } from '@/redux/slice/shapes'
import type { StyleGuide } from '@/types/style-guide'

/**
 * What a design is, read once.
 *
 * The palette, the type scale, the radii and the section structure are
 * measured off the design and its style guide rather than inferred — a builder
 * that has to guess a colour has been failed by whatever handed it the design.
 *
 * That reading used to live inside the markdown brief, which meant the project
 * export would have had to derive the same facts a second way. Two readers of
 * one design disagree eventually, and the disagreement shows up as an exported
 * project whose palette does not match the brief that came with it. One
 * reading, two formats.
 */

/** The name an element carries once it has been made a component. */
export const COMPONENT_ATTR = 'data-mason-component'

/** A section, as far as a reader of the page is concerned. */
export type DesignSection = {
  tag: string
  heading: string
  /** What it is made of, which matters more than its prose. */
  summary: string
  html: string
  /** Set when this section is itself a named component. */
  component: string | null
}

export type DesignComponent = {
  name: string
  /** The first appearance, which is the one the export emits. */
  html: string
  /** How many times it appears in the design. */
  count: number
}

export type DesignTokens = {
  theme: string | null
  description: string | null
  family: string | null
  colours: { token: string; hex: string; name: string; description?: string }[]
  type: {
    name: string
    fontSize: number | null
    fontWeight: number | string
    lineHeight: number | null
    letterSpacing: number | null
    usage: string
  }[]
  radii: { name: string; value: number }[]
  elevation: { name: string; shadow: string; usage: string }[]
}

export type DesignModel = {
  name: string
  html: string
  sections: DesignSection[]
  components: DesignComponent[]
  tokens: DesignTokens
}

/**
 * The element the page's sections hang off.
 *
 * A generated design is usually one wrapper holding the sections; when it is
 * not, the body is the wrapper. Getting this wrong turns a page of six
 * sections into a page of one.
 */
const rootOf = (body: HTMLElement): HTMLElement =>
  body.children.length === 1 ? (body.firstElementChild as HTMLElement) : body

const summarise = (section: Element): string => {
  const paragraph = section.querySelector('p')?.textContent?.trim() ?? ''

  const parts: string[] = []
  const count = (selector: string, label: string) => {
    const n = section.querySelectorAll(selector).length
    if (n > 0) parts.push(`${n} ${label}${n === 1 ? '' : 's'}`)
  }
  count('img', 'image')
  count('button', 'button')
  count('a', 'link')
  count('input, textarea, select', 'form control')

  return [paragraph.slice(0, 90), parts.join(', ')].filter(Boolean).join(' — ')
}

/**
 * Reads the page's top-level structure.
 *
 * Only the outermost run of elements: a design's real sections are its direct
 * children, and descending further produces an outline of every card on the
 * page rather than an outline of the page.
 */
export const readSections = (html: string): DesignSection[] => {
  if (typeof window === 'undefined') return []

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')

  return Array.from(rootOf(doc.body).children).map((child) => ({
    tag: child.tagName.toLowerCase(),
    heading: child.querySelector('h1, h2, h3')?.textContent?.trim() ?? '',
    summary: summarise(child),
    html: child.outerHTML,
    component: child.getAttribute(COMPONENT_ATTR)?.trim() || null,
  }))
}

/**
 * Every named component, in the order they first appear.
 *
 * Grouped by name rather than by markup: two instances that have drifted apart
 * are still one component, and the first appearance is the one that is
 * exported. Pushing an edit to the other instances is a deliberate act in the
 * editor, so the export must not quietly pick a winner by voting.
 */
export const readComponents = (html: string): DesignComponent[] => {
  if (typeof window === 'undefined') return []

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const found = new Map<string, DesignComponent>()

  for (const node of Array.from(doc.body.querySelectorAll<HTMLElement>(`[${COMPONENT_ATTR}]`))) {
    const name = node.getAttribute(COMPONENT_ATTR)?.trim()
    if (!name) continue
    const existing = found.get(name)
    if (existing) existing.count += 1
    else found.set(name, { name, html: node.outerHTML, count: 1 })
  }

  return Array.from(found.values())
}

const readTokens = (guide: StyleGuide | null): DesignTokens => ({
  theme: guide?.theme ?? null,
  description: guide?.description ?? null,
  family: guide ? primaryFamily(guide.typography.fontFamily) : null,

  colours: (guide?.colorSections ?? []).flatMap((section) =>
    section.swatches.map((swatch) => ({
      token: swatch.token,
      hex: swatch.color.toUpperCase(),
      name: swatch.name,
      description: swatch.description,
    })),
  ),

  // The measured scale when there is one; the guide's named styles when there
  // is not, which carry a weight and nothing else.
  type: guide?.typeScale?.length
    ? guide.typeScale.map((style) => ({
        name: style.name,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        usage: style.usage,
      }))
    : (guide?.typography.styles ?? []).map((style) => ({
        name: style.name,
        fontSize: null,
        fontWeight: style.weight,
        lineHeight: null,
        letterSpacing: null,
        usage: '',
      })),

  radii: guide?.radii ?? [],
  elevation: guide?.elevation ?? [],
})

export const readDesign = (design: Shape, guide: StyleGuide | null): DesignModel => {
  const html = (design.html ?? '').trim()
  return {
    name: design.label || 'Untitled design',
    html,
    sections: readSections(html),
    components: readComponents(html),
    tokens: readTokens(guide),
  }
}
