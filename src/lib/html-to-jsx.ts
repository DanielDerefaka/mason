import { parseDeclarations, toTailwind } from '@/lib/tailwind-from-css'

/**
 * A design's markup as JSX.
 *
 * The awkward half of the project export. HTML and JSX look alike and differ
 * everywhere it matters: attribute names, void elements, braces in text, and
 * the case of every SVG attribute. Each of those is a file that either
 * compiles or does not, so they are handled here once rather than patched up
 * per element.
 */

/** Attributes React spells differently from HTML. */
const RENAMED: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  maxlength: 'maxLength',
  readonly: 'readOnly',
  autocomplete: 'autoComplete',
  inputmode: 'inputMode',
  datetime: 'dateTime',
  srcset: 'srcSet',
  // SVG, where the DOM has already lowercased what the parser took in.
  viewbox: 'viewBox',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  gradientunits: 'gradientUnits',
  preserveaspectratio: 'preserveAspectRatio',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'text-anchor': 'textAnchor',
}

/** Attributes that are true by their presence alone. */
const BOOLEAN = new Set(['disabled', 'checked', 'selected', 'open', 'multiple', 'readonly'])

/** Elements with no closing tag, which JSX requires be self-closed. */
const VOID = new Set(['img', 'input', 'br', 'hr', 'col', 'source', 'path', 'circle', 'rect',
  'ellipse', 'line', 'polygon', 'polyline', 'stop', 'use'])

/** The editor's own bookkeeping, which is not part of the design. */
const isEditorAttribute = (name: string) => name.startsWith('data-mason-')

const SVG_NS = 'http://www.w3.org/2000/svg'

const tagOf = (element: Element) =>
  // SVG keeps the parser's casing — `linearGradient` is not `lineargradient`
  // to React — while HTML is lowercase throughout.
  element.namespaceURI === SVG_NS ? element.tagName : element.tagName.toLowerCase()

/**
 * Text as a JSX child.
 *
 * Braces open an expression and angle brackets open an element, so both have
 * to leave as expressions themselves. A non-breaking space is escaped because
 * it is otherwise an invisible character sitting in a source file, which is
 * how one gets deleted by accident later.
 */
export const escapeText = (text: string): string =>
  text
    .replace(/[{}<>]/g, (character) => `{'${character}'}`)
    .replace(/\u00a0/g, "{'\\u00a0'}")

const quote = (value: string) => (value.includes('"') ? `{${JSON.stringify(value)}}` : `"${value}"`)

/** `background-color` → `backgroundColor`, for a style object. */
const camel = (property: string) =>
  property.startsWith('--')
    ? property
    : property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

const styleProp = (leftover: Record<string, string>): string | null => {
  const entries = Object.entries(leftover)
  if (entries.length === 0) return null
  const body = entries
    .map(([property, value]) => {
      const key = camel(property)
      return `${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${JSON.stringify(value)}`
    })
    .join(', ')
  return `style={{ ${body} }}`
}

export type JsxOptions = {
  /**
   * Asked of every element except the one the render started from. A name
   * means the element is a component in its own right and is referenced
   * rather than written out.
   *
   * The exception matters: without it a component whose root carries a name
   * renders as a reference to itself, which type-checks and recurses until the
   * stack gives out.
   */
  boundary?: (element: Element) => string | null
  /** Rewrites `src` and `href`, for making image routes absolute. */
  url?: (value: string) => string
}

const attributes = (element: Element, options: JsxOptions): string[] => {
  const props: string[] = []
  let className = ''

  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase()
    if (isEditorAttribute(name) || name === 'style' || name.startsWith('on')) continue

    if (name === 'class') {
      className = attribute.value.trim()
      continue
    }
    if (BOOLEAN.has(name)) {
      props.push(RENAMED[name] ?? name)
      continue
    }

    const value =
      (name === 'src' || name === 'href') && options.url ? options.url(attribute.value) : attribute.value
    // data-* and aria-* are already what React wants; everything else may not be.
    const prop = name.startsWith('data-') || name.startsWith('aria-') ? name : (RENAMED[name] ?? name)
    props.push(`${prop}=${quote(value)}`)
  }

  const declarations = parseDeclarations(element.getAttribute('style') ?? '')
  const { classes, leftover } = toTailwind(declarations)
  // `class="grid"` on an element that also has `display: grid` would
  // otherwise come out as `grid grid`.
  const all = Array.from(new Set([...className.split(/\s+/), ...classes]))
    .filter(Boolean)
    .join(' ')

  if (all) props.unshift(`className=${quote(all)}`)
  const style = styleProp(leftover)
  if (style) props.push(style)

  return props
}

const INDENT = '  '

/**
 * Runs of ordinary whitespace collapse; a non-breaking space does not.
 *
 * `\s` matches U+00A0 too, so the obvious `/\s+/` quietly turns every
 * `&nbsp;` into a plain space — undoing the one thing it was written for.
 */
const flatten = (text: string) => text.replace(/[ \t\r\n\f]+/g, ' ').trim()

/** Whether the element's children are one short run of text. */
const isSimpleText = (element: Element) =>
  element.children.length === 0 && (element.textContent ?? '').trim().length <= 60

const render = (node: Node, depth: number, options: JsxOptions, root: Node): string[] => {
  const pad = INDENT.repeat(depth)

  if (node.nodeType === Node.TEXT_NODE) {
    const text = flatten(node.textContent ?? '')
    return text ? [`${pad}${escapeText(text)}`] : []
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return []

  const element = node as Element
  // A stylesheet inside the design travels to globals.css instead; leaving it
  // here would put a <style> tag in the middle of a component.
  if (tagOf(element) === 'style') return []

  const component = element === root ? null : options.boundary?.(element)
  if (component) return [`${pad}<${component} />`]

  const tag = tagOf(element)
  const props = attributes(element, options)
  const open = props.length > 0 ? `<${tag} ${props.join(' ')}` : `<${tag}`

  // Long attribute lists go one per line; the alternative is a 400-column file.
  const openLines =
    open.length > 90 && props.length > 1
      ? [`${pad}<${tag}`, ...props.map((prop) => `${pad}${INDENT}${prop}`)]
      : [open === `<${tag}` ? `${pad}<${tag}` : `${pad}${open}`]

  if (VOID.has(tag) || element.children.length === 0 && !(element.textContent ?? '').trim()) {
    if (openLines.length > 1) return [...openLines, `${pad}/>`]
    return [`${openLines[0]} />`]
  }

  if (isSimpleText(element) && openLines.length === 1) {
    const text = escapeText(flatten(element.textContent ?? ''))
    return [`${openLines[0]}>${text}</${tag}>`]
  }

  const children = Array.from(element.childNodes).flatMap((child) =>
    render(child, depth + 1, options, root),
  )

  const opened = openLines.length > 1 ? [...openLines, `${pad}>`] : [`${openLines[0]}>`]
  return [...opened, ...children, `${pad}</${tag}>`]
}

/** One element as a JSX tree, indented from `depth`. */
export const elementToJsx = (element: Element, options: JsxOptions = {}, depth = 0): string =>
  render(element, depth, options, element).join('\n')

/** The children of a container as JSX, for a page that has no wrapper of its own. */
export const childrenToJsx = (
  container: Element,
  options: JsxOptions = {},
  depth = 0,
): string =>
  Array.from(container.childNodes)
    .flatMap((child) => render(child, depth, options, container))
    .join('\n')
