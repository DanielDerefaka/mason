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
  // Controls that actually do something. A design drawn with divs is a
  // picture of an interface; these are the elements that make it one.
  'details', 'summary', 'label', 'option', 'optgroup', 'fieldset', 'legend',
  // Scoped and rewritten below. Without it a design has no way to express a
  // hover, a focus ring or a selected state, because an inline style cannot.
  'style',
  // Inline icons.
  'svg', 'circle', 'ellipse', 'g', 'line', 'path', 'polygon', 'polyline',
  'rect', 'defs', 'lineargradient', 'radialgradient', 'stop', 'text', 'tspan',
])

const ALLOWED_ATTRS = new Set([
  'style', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan', 'type',
  'placeholder', 'value', 'checked', 'disabled', 'readonly', 'datetime', 'role',
  'aria-label', 'aria-hidden',
  // What the CSS-only patterns need: a class to select on, and the id/for/name
  // triple that links a label to the input it controls. None of them can carry
  // behaviour — they are hooks for selectors, not for script.
  'class', 'id', 'for', 'name', 'selected', 'open', 'multiple', 'min', 'max',
  'step', 'rows', 'cols', 'maxlength', 'inputmode', 'aria-expanded',
  'aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-current',
  'aria-pressed', 'aria-selected', 'tabindex',
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

/**
 * The class every rendered design is wrapped in.
 *
 * A design's stylesheet is rewritten so that every selector in it is confined
 * beneath this class. It is the difference between a generated page styling
 * itself and a generated page styling the application around it — without it,
 * one `body { display: none }` from a model would blank the editor.
 */
export const DESIGN_SCOPE = 'mason-design'

/* ------------------------------------------------------------------ *
 * CSS
 *
 * Allowing a stylesheet through is what makes a design interactive at all: a
 * hover, a focus ring, and a selected state are impossible in an inline style,
 * so without this every control is a picture of a control.
 *
 * CSS cannot execute script in any browser this app supports, so the risk is
 * not code — it is reach and it is exfiltration. Both are handled here:
 * selectors are confined to the design's own subtree, and a declaration that
 * fetches from somewhere it should not is dropped rather than the whole rule.
 * ------------------------------------------------------------------ */

/** Splits on a character only where it is not nested inside brackets or quotes. */
const splitTop = (input: string, separator: string): string[] => {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (quote) {
      if (char === quote && input[index - 1] !== '\\') quote = null
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === '(' || char === '[') depth += 1
    else if (char === ')' || char === ']') depth -= 1
    else if (char === separator && depth === 0) {
      parts.push(input.slice(start, index))
      start = index + 1
    }
  }
  parts.push(input.slice(start))
  return parts
}

/** Constructs that reach back into script, or pull a stylesheet in wholesale. */
const UNSAFE_DECLARATION = /expression\s*\(|javascript\s*:|-moz-binding|behaviou?r\s*:|@import/i

/**
 * Every URL a declaration fetches.
 *
 * Parsed rather than pattern-matched: an earlier version folded the check into
 * one regex with an optional quote, and the engine simply backtracked past the
 * quote to make the negative lookahead succeed — so a legitimate inline image
 * was dropped while a remote one sailed through. A rule this small is not worth
 * a regex nobody can read.
 */
const declarationUrls = (declaration: string): string[] =>
  Array.from(declaration.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)).map((match) =>
    match[2].trim().toLowerCase(),
  )

/**
 * Where a stylesheet may fetch from: inline bytes, this application's own image
 * route, or a fragment.
 *
 * Deliberately tighter than the rule for `<img src>`, which permits any https
 * host. A photograph in a design arrives through an `<img>` and the image
 * route; there is no case where generated CSS legitimately needs a third-party
 * host, and a background image is a quiet way to tell someone else's server
 * every time a shared design is opened, and from where.
 */
const isSafeCssUrl = (value: string) =>
  value.startsWith('data:image/') || value.startsWith('/api/image/') || value.startsWith('#')

const sanitiseDeclarations = (body: string): string =>
  splitTop(body, ';')
    .map((declaration) => declaration.trim())
    .filter(
      (declaration) =>
        declaration &&
        !UNSAFE_DECLARATION.test(declaration) &&
        declarationUrls(declaration).every(isSafeCssUrl),
    )
    .join('; ')

/**
 * Confines a selector list to the design's subtree.
 *
 * A rule aimed at the document root is retargeted at the wrapper rather than
 * dropped, because `body { background: … }` is how a design states its own page
 * colour and throwing it away would leave the design unpainted.
 */
const scopeSelectors = (selectorList: string, scope: string): string =>
  splitTop(selectorList, ',')
    .map((selector) => selector.trim())
    .filter(Boolean)
    .map((selector) =>
      /^(html|body|:root)\b/i.test(selector)
        ? selector.replace(/^(html|body|:root)/i, scope)
        : `${scope} ${selector}`,
    )
    .join(', ')

/** At-rules whose contents are ordinary rules, so they are scoped recursively. */
const NESTED_AT_RULES = /^@(media|supports|layer|container)\b/i
/** At-rules whose contents are not selectors and must not be scoped. */
const FLAT_AT_RULES = /^@(keyframes|-webkit-keyframes|font-face|page|counter-style|property)\b/i

export const sanitiseCss = (css: string, scope = `.${DESIGN_SCOPE}`): string => {
  // Comments first: they can hide a brace and desynchronise the walk below.
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: string[] = []

  let depth = 0
  let blockStart = -1
  let preludeStart = 0

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (char === '{') {
      if (depth === 0) blockStart = index
      depth += 1
      continue
    }
    if (char === '}') {
      depth -= 1
      if (depth === 0 && blockStart !== -1) {
        const prelude = source.slice(preludeStart, blockStart).trim()
        const body = source.slice(blockStart + 1, index)

        if (prelude.startsWith('@')) {
          if (NESTED_AT_RULES.test(prelude)) {
            const inner = sanitiseCss(body, scope)
            if (inner) rules.push(`${prelude}{${inner}}`)
          } else if (FLAT_AT_RULES.test(prelude)) {
            // Keyframe stops are percentages, not selectors — scoping them
            // would produce `.mason-design 0%`, which matches nothing and
            // silently kills every animation in the design.
            rules.push(`${prelude}{${body}}`)
          }
          // Everything else — @import above all — is dropped.
        } else {
          const declarations = sanitiseDeclarations(body)
          const selectors = scopeSelectors(prelude, scope)
          if (declarations && selectors) rules.push(`${selectors}{${declarations}}`)
        }

        preludeStart = index + 1
        blockStart = -1
      }
      continue
    }
    // A statement at-rule with no block, `@import url(...)` being the one that
    // matters, ends at its semicolon and is skipped entirely.
    if (char === ';' && depth === 0) preludeStart = index + 1
  }

  return rules.join('')
}

export const sanitiseHtml = (html: string): string => {
  if (typeof window === 'undefined') return ''

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')

  // Comments never render, so this is not about what the page looks like. It
  // is about what leaves with it: a design is shareable by public link and
  // exportable as a file, and a comment is where a model puts the thinking it
  // was not asked to publish. Stripping them also makes the truncation marker
  // genuinely unable to survive into stored markup rather than merely
  // invisible there.
  const comments = doc.createNodeIterator(doc.body, NodeFilter.SHOW_COMMENT)
  const found: Comment[] = []
  for (let node = comments.nextNode(); node; node = comments.nextNode()) {
    found.push(node as Comment)
  }
  for (const comment of found) comment.remove()

  // Snapshot first: removing while walking a live NodeList skips siblings.
  for (const element of Array.from(doc.body.querySelectorAll('*'))) {
    const tag = element.tagName.toLowerCase()

    if (!ALLOWED_TAGS.has(tag)) {
      element.remove()
      continue
    }

    if (tag === 'style') {
      // Rewritten rather than trusted. Everything that survives is confined
      // beneath the design's wrapper, so a stylesheet can shape the design and
      // cannot touch the application rendering it.
      const safe = sanitiseCss(element.textContent ?? '')
      if (!safe) element.remove()
      else element.textContent = safe
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
 * Drops a leading fragment of tag innards.
 *
 * A model that opens with its root tag split across lines can have a chunk
 * boundary land inside it, and everything before the first `<` is then parsed
 * as text — so the page renders with `style="width:100%;...">` printed across
 * the top. Real content never starts with an attribute, so anything before the
 * first tag carrying `="` is leftovers, not copy.
 */
const stripOrphanAttributes = (html: string): string => {
  const firstTag = html.indexOf('<')
  const head = firstTag === -1 ? html : html.slice(0, firstTag)
  if (!/=\s*["']/.test(head)) return html
  return firstTag === -1 ? '' : html.slice(firstTag)
}

/**
 * A stream is cut off mid-tag most of the time, and the parser closes whatever
 * is dangling — which is exactly what we want for a live preview.
 */
export const sanitisePartialHtml = (html: string): string => {
  const fenceless = html.replace(/^\s*```(?:html)?\s*/i, '').replace(/```\s*$/, '')
  return sanitiseHtml(stripOrphanAttributes(fenceless))
}
