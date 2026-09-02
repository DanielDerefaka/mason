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
  // What a sign-up box or a sign-in card actually is, and what a model wraps
  // its inputs in. It was missing, and a removed element takes its subtree
  // with it, so the whole box vanished on first paint with nothing in the
  // layer tree to say it had been there. Inert: `action`, `method` and
  // `enctype` are not on the attribute list below, so a surviving form has
  // nowhere to send anything, and `onsubmit` goes with every other handler.
  'form',
  // Inline semantics a landing page is written with, which the walk used to
  // delete contents and all.
  'address', 'kbd', 'q', 'cite',
  // A container and nothing more. Its `<source>` children are still removed:
  // `srcset` is a list with a grammar of its own (a comma separates
  // candidates except inside a data URL) that the one-URL rule for `src`
  // does not read, so they stay out until it does. Without them a picture
  // renders its `<img>` fallback, which is the photograph; allowing the tag
  // is what keeps that fallback on the page.
  'picture',
  // Scoped and rewritten below. Without it a design has no way to express a
  // hover, a focus ring or a selected state, because an inline style cannot.
  'style',
  // Inline icons.
  'svg', 'circle', 'ellipse', 'g', 'line', 'path', 'polygon', 'polyline',
  'rect', 'defs', 'lineargradient', 'radialgradient', 'stop', 'text', 'tspan',
  // The parts of an icon that are referenced rather than drawn: a clip, a
  // mask, a symbol a `<use>` repeats, and the name and description a screen
  // reader gets. `use` is held to a fragment reference and `title` to the
  // SVG namespace in the walk below.
  'clippath', 'mask', 'symbol', 'use', 'title', 'desc',
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
  // What the layer tree records about a node: the name it was given, whether
  // it is hidden and whether it is locked. Part of the design rather than of
  // an editing session, so they have to survive the round trip through
  // storage — which means surviving this walk on the way back in.
  'data-mason-name', 'data-mason-hidden', 'data-mason-locked',
  // And the name that makes a subtree a component, which the project export
  // turns into a file of its own.
  'data-mason-component',
  // SVG geometry and paint.
  'viewbox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2',
  'y1', 'y2', 'points', 'transform', 'opacity', 'offset', 'stop-color',
  'gradientunits', 'preserveaspectratio', 'xmlns',
  // Paint the walk used to strip. `fill-rule="evenodd"` is how most icon
  // sets cut the holes in a filled glyph, so without it a ring rendered as a
  // disc and an outlined letter as a blob. None of these can name a URL.
  'fill-rule', 'clip-rule', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray',
  'stroke-dashoffset', 'text-anchor', 'dominant-baseline',
  // How a photograph loads, not where from: both take a fixed set of keywords.
  'loading', 'decoding',
])

/** Only these may carry a URL, and only an inert one. */
const URL_ATTRS = new Set(['href', 'src'])

/**
 * Presentation attributes whose value is CSS, and so can fetch.
 *
 * `clip-path="url(#clip)"` reaches the clipPath beside it, which is the whole
 * point of it; `clip-path="url(https://…)"` is the same request a background
 * image makes, one attribute over. Held to the stylesheet's rule rather than
 * the `<img src>` one, for the reason the stylesheet is.
 */
const CSS_VALUE_ATTRS = new Set(['clip-path', 'mask'])

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

/**
 * Where a `<use>` may point: back into its own document, and nowhere else.
 *
 * A fragment clones an element that has already been through this walk. A
 * path or an https URL fetches an SVG document from somewhere, and whatever
 * arrives has not, so both spellings of the reference are held to a `#`.
 */
const isFragment = (value: string) => value.trim().startsWith('#')

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

/**
 * A scope of its own for one design among many.
 *
 * The regression this exists for: every design rendered under the same
 * `.mason-design` class, and every design's stylesheet was rewritten to sit
 * beneath that same class — so on any page showing more than one at a time
 * (the gallery, the dashboard grid, a canvas with two frames on it) each
 * design restyled its neighbours. The first card's `h1 { color: red }` turned
 * every other card's headings red.
 *
 * Only for views that render and never write back. What is stored stays
 * scoped to the shared class, and `scopeSelectors` re-targets between the two
 * rather than nesting one inside the other.
 */
export const designScope = (key: string) => {
  const suffix = key.toLowerCase().replace(/[^a-z0-9]/g, '')
  return suffix ? `${DESIGN_SCOPE}-${suffix}` : DESIGN_SCOPE
}

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

/**
 * Splits on a character only where it is not nested inside brackets or quotes.
 *
 * Exported because the inspector needs the same rule: `box-shadow` and
 * `background-image` are comma-separated lists whose entries contain commas of
 * their own, so `rgba(0, 0, 0, 0.4)` is one value and not four.
 */
export const splitTop = (input: string, separator: string): string[] => {
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
const APPLIED_SCOPE = new RegExp(`^\\.${DESIGN_SCOPE}(-[a-z0-9]+)?(?![\\w-])\\s*`)

const scopeSelectors = (selectorList: string, scope: string): string =>
  splitTop(selectorList, ',')
    .map((selector) => selector.trim())
    .filter(Boolean)
    .map((selector) => {
      /**
       * Scoping is idempotent, and it has to be.
       *
       * A design is sanitised on the way in, edited, serialised back to
       * storage with its stylesheet already scoped, and sanitised again on the
       * next render. Prefixing unconditionally therefore added a level every
       * time it was opened — `.mason-design .mason-design .card` needs a
       * wrapper nested inside a wrapper, and there is only ever one, so the
       * rule matched nothing and the design silently lost every hover, focus,
       * selected state and breakpoint it had.
       *
       * It looked like opening the preview corrupting the design, because the
       * damage was written back on the next save.
       *
       * Any scope this module has applied before is stripped, not just this
       * one, so a stored stylesheet scoped to the shared class can be
       * re-targeted at a per-design scope (see `designScope`) and back again
       * without ever nesting.
       */
      const bare = selector.replace(APPLIED_SCOPE, '').trim()
      if (!bare) return scope

      /**
       * A selector may not begin with a sibling combinator.
       *
       * `+ nav` scoped by prefix becomes `.mason-design + nav`, which is not
       * inside the design at all — it is whatever the application happens to
       * render next to it. The one selector shape that walks *out* of the
       * subtree the scope exists to confine it to, so it is dropped rather
       * than rewritten; a child combinator (`> nav`) stays, being still
       * beneath the wrapper.
       */
      if (/^[+~]/.test(bare)) return ''

      return /^(html|body|:root)\b/i.test(bare)
        ? bare.replace(/^(html|body|:root)/i, scope)
        : `${scope} ${bare}`
    })
    .filter(Boolean)
    .join(', ')

/** At-rules whose contents are ordinary rules, so they are scoped recursively. */
const NESTED_AT_RULES = /^@(media|supports|layer|container)\b/i
/** Stops and declarations, not selectors: scoped never, cleaned per stop. */
const KEYFRAMES_AT_RULE = /^@(-webkit-)?keyframes\b/i
/** At-rules whose contents are plain declarations and must not be scoped. */
const FLAT_AT_RULES = /^@(font-face|page|counter-style|property)\b/i

/**
 * Cleans the declarations inside a keyframes body, leaving the stops alone.
 *
 * The regression this exists for: the whole body was passed through
 * untouched, on the grounds that `0%` is not a selector — true, and it meant
 * `@keyframes x { to { background: url(https://elsewhere/p.gif) } }` was the
 * one place in a design's stylesheet that could still fetch from anywhere.
 * The stop stays verbatim; only what is inside each block is filtered.
 *
 * Keyframe blocks do not nest, so one pass is enough.
 */
const sanitiseKeyframes = (body: string): string =>
  body.replace(/([^{}]*)\{([^{}]*)\}/g, (_match, stop: string, declarations: string) => {
    const safe = sanitiseDeclarations(declarations)
    return safe ? `${stop.trim()}{${safe}}` : ''
  })

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
          } else if (KEYFRAMES_AT_RULE.test(prelude)) {
            // Keyframe stops are percentages, not selectors — scoping them
            // would produce `.mason-design 0%`, which matches nothing and
            // silently kills every animation in the design. The declarations
            // inside each stop are still cleaned.
            const inner = sanitiseKeyframes(body)
            if (inner.trim()) rules.push(`${prelude}{${inner}}`)
          } else if (FLAT_AT_RULES.test(prelude)) {
            // @font-face above all: its `src` is a fetch like any other, and
            // it used to be the one declaration in a design that could point
            // anywhere it liked.
            const declarations = sanitiseDeclarations(body)
            if (declarations) rules.push(`${prelude}{${declarations}}`)
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

export const sanitiseHtml = (html: string, scope: string = DESIGN_SCOPE): string => {
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

    // `title` is on the list for an icon's accessible name, which lives in
    // the SVG namespace. The HTML element of the same name is a document's
    // title, which has no business inside a design and stays removed.
    if (!ALLOWED_TAGS.has(tag) || (tag === 'title' && element.namespaceURI !== SVG_NAMESPACE)) {
      element.remove()
      continue
    }

    if (tag === 'style') {
      // Rewritten rather than trusted. Everything that survives is confined
      // beneath the design's wrapper, so a stylesheet can shape the design and
      // cannot touch the application rendering it.
      const safe = sanitiseCss(element.textContent ?? '', `.${scope}`)
      if (!safe) element.remove()
      else element.textContent = safe
      continue
    }

    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase()

      if (tag === 'use' && (name === 'href' || name === 'xlink:href')) {
        if (!isFragment(attr.value)) element.removeAttribute(attr.name)
        continue
      }
      if (URL_ATTRS.has(name)) {
        if (!isSafeUrl(attr.value)) element.removeAttribute(attr.name)
        continue
      }
      if (CSS_VALUE_ATTRS.has(name)) {
        if (!declarationUrls(attr.value).every(isSafeCssUrl)) element.removeAttribute(attr.name)
        continue
      }
      if (name === 'style') {
        // Held to the same rule as the stylesheet. It was kept verbatim, and
        // it is the same language: `style="background:url(https://elsewhere)"`
        // fetched from anywhere it liked, which is the exfiltration the
        // stylesheet rules exist to prevent, one attribute to the left.
        const safe = sanitiseDeclarations(attr.value)
        if (safe) element.setAttribute('style', safe)
        else element.removeAttribute(attr.name)
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
export const sanitisePartialHtml = (html: string, scope: string = DESIGN_SCOPE): string => {
  const fenceless = html.replace(/^\s*```(?:html)?\s*/i, '').replace(/```\s*$/, '')
  return sanitiseHtml(stripOrphanAttributes(fenceless), scope)
}
