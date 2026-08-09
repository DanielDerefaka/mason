/**
 * Cleans model-authored markup before it is mounted with dangerouslySetInnerHTML.
 *
 * Parsed with DOMParser and walked node by node rather than filtered with
 * regexes: the browser's own parser sees the same tree the renderer will, so
 * there is no gap between what the regex matched and what actually executes.
 * The document is inert — parseFromString does not run scripts or fetch
 * anything — so removals happen before the nodes reach the live page.
 */
const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'article', 'aside', 'b', 'blockquote', 'br', 'button', 'caption',
  'code', 'col', 'colgroup', 'dd', 'div', 'dl', 'dt', 'em', 'figcaption',
  'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i',
  'img', 'input', 'label', 'li', 'main', 'mark', 'nav', 'ol', 'p', 'pre', 's',
  'section', 'select', 'small', 'span', 'strong', 'sub', 'sup', 'table',
  'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul',
  // Inline icons.
  'svg', 'circle', 'ellipse', 'g', 'line', 'path', 'polygon', 'polyline',
  'rect', 'defs', 'lineargradient', 'radialgradient', 'stop', 'text', 'tspan',
])

const ALLOWED_ATTRS = new Set([
  'style', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan', 'type',
  'placeholder', 'value', 'checked', 'disabled', 'readonly', 'datetime', 'role',
  'aria-label', 'aria-hidden',
  // SVG geometry and paint.
  'viewbox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2',
  'y1', 'y2', 'points', 'transform', 'opacity', 'offset', 'stop-color',
  'gradientunits', 'preserveaspectratio', 'xmlns',
])

/** Only these may carry a URL, and only an inert one. */
const URL_ATTRS = new Set(['href', 'src'])

const isSafeUrl = (value: string) => {
  const trimmed = value.trim().toLowerCase()
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return true
  return trimmed.startsWith('https://') || trimmed.startsWith('data:image/')
}

export const sanitiseHtml = (html: string): string => {
  if (typeof window === 'undefined') return ''

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')

  // Snapshot first: removing while walking a live NodeList skips siblings.
  for (const element of Array.from(doc.body.querySelectorAll('*'))) {
    const tag = element.tagName.toLowerCase()

    if (!ALLOWED_TAGS.has(tag)) {
      element.remove()
      continue
    }

    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase()

      if (URL_ATTRS.has(name)) {
        if (!isSafeUrl(attr.value)) element.removeAttribute(attr.name)
        continue
      }
      // Covers onclick, onerror and every other handler in one rule.
      if (name.startsWith('on') || !ALLOWED_ATTRS.has(name)) {
        element.removeAttribute(attr.name)
      }
    }
  }

  return doc.body.innerHTML
}

/**
 * A stream is cut off mid-tag most of the time, and the parser closes whatever
 * is dangling — which is exactly what we want for a live preview.
 */
export const sanitisePartialHtml = (html: string): string => {
  const fenceless = html.replace(/^\s*```(?:html)?\s*/i, '').replace(/```\s*$/,'')
  return sanitiseHtml(fenceless)
}
