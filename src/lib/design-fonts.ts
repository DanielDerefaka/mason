
/**
 * The typefaces a generated design asks for.
 *
 * The prompt tells the model to name a family Google actually hosts, and when
 * there is no style guide to bind `var(--font-family)` to it tells the model to
 * write the family literally. Nothing then fetched it: `useGoogleFont` is fed
 * `styleGuide?.typography.fontFamily`, which on /try is undefined, and the
 * sanitiser drops `@import` on purpose, so the one route the model has to load
 * a face of its own is closed. Every design a first-time visitor generated
 * therefore rendered in whatever the fallback stack reached first: Didot on a
 * Mac, which flatters it, Georgia on Windows, which does not. Typography is
 * most of why a design looks designed, so the design nobody saw was the one
 * that had been designed.
 *
 * This reads the families out of the design's own CSS so they can be loaded
 * whatever the guide says, and it is deliberately dumb: a name, not a parse.
 */

/** Resolved by the browser, never by Google. */
const GENERIC = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
])

/**
 * Faces that ship with an operating system. Asking Google for one costs a
 * request that 404s, and a design naming Helvetica first means Helvetica.
 */
const SYSTEM = new Set([
  '-apple-system',
  'blinkmacsystemfont',
  'american typewriter',
  'apple color emoji',
  'arial',
  'arial black',
  'avenir',
  'avenir next',
  'baskerville',
  'bodoni 72',
  'brush script mt',
  'calibri',
  'cambria',
  'candara',
  'charter',
  'comic sans ms',
  'consolas',
  'copperplate',
  'courier',
  'courier new',
  'didot',
  'franklin gothic medium',
  'futura',
  'geneva',
  'georgia',
  'gill sans',
  'helvetica',
  'helvetica neue',
  'hoefler text',
  'impact',
  'iowan old style',
  'lucida grande',
  'menlo',
  'monaco',
  'optima',
  'palatino',
  'palatino linotype',
  'papyrus',
  'segoe ui',
  'segoe ui emoji',
  'sf pro',
  'sf mono',
  'tahoma',
  'times',
  'times new roman',
  'trebuchet ms',
  'verdana',
])

/**
 * Bundled by the application through `next/font`. Asking Google for one fetches
 * a second copy of a font the page already has.
 *
 * True of every screen Mason renders and of none of the files it writes: an
 * exported page on somebody's desktop has no `next/font` behind it, so there
 * the same name has to be linked like any other. `includeBundled` is which of
 * the two the caller is.
 */
const BUNDLED = new Set(['inter', 'geist', 'geist mono', 'fraunces'])

/**
 * A design naming more faces than this is improvising rather than pairing, and
 * every extra family is a render-blocking stylesheet on someone's first visit.
 */
export const MAX_FAMILIES = 4

/** Weights Google publishes. Anything else the model invents is snapped away. */
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900]

const unquote = (value: string) =>
  value
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Declaration bodies, taken from the two places a fragment can carry CSS.
 *
 * Split rather than swept, because a value ends at a different character in
 * each: `;` or `}` inside a stylesheet, the closing quote inside an attribute.
 * One regex over the whole string gets the quoted family names wrong in one of
 * the two, and a family called "Bodoni Moda" is exactly the case that matters.
 */
const declarations = (html: string): string[] => {
  const bodies: string[] = []

  for (const [, css] of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const [, value] of css.matchAll(/font-family\s*:\s*([^;}]+)/gi)) bodies.push(value)
  }

  for (const [, attribute] of html.matchAll(/style\s*=\s*"([^"]*)"/gi)) {
    for (const [, value] of attribute.matchAll(/font-family\s*:\s*([^;]+)/gi)) bodies.push(value)
  }

  for (const [, attribute] of html.matchAll(/style\s*=\s*'([^']*)'/gi)) {
    for (const [, value] of attribute.matchAll(/font-family\s*:\s*([^;]+)/gi)) bodies.push(value)
  }

  return bodies
}

/**
 * The head of a font stack, unquoted. What Google is asked for; the rest of a
 * stack is what the browser does when Google does not answer.
 */
export const headFamily = (stack: string) => unquote(stack.split(',')[0] ?? stack)

/**
 * The families to fetch, in the order the design first mentions them.
 *
 * Only the head of each stack: the rest of a stack is by definition what to
 * fall back to when the head does not arrive, so fetching it defeats the point.
 */
export const familiesInDesign = (
  html: string | null | undefined,
  options: { includeBundled?: boolean } = {},
): string[] => {
  if (!html) return []

  const found: string[] = []
  const seen = new Set<string>()

  for (const body of declarations(html)) {
    const head = headFamily(body)
    const key = head.toLowerCase()

    // `var(--font-family)` is the style guide's, and `useGoogleFont` has it.
    if (!head || head.includes('var(') || head.includes('(')) continue
    if (GENERIC.has(key) || SYSTEM.has(key)) continue
    if (BUNDLED.has(key) && !options.includeBundled) continue
    if (seen.has(key)) continue

    seen.add(key)
    found.push(head)
    if (found.length === MAX_FAMILIES) break
  }

  return found
}

/**
 * The weights the design actually sets, so the request asks for what the page
 * uses rather than a fixed spread that a two-weight family cannot answer.
 */
export const weightsInDesign = (html: string | null | undefined): number[] => {
  const used = new Set<number>([400])

  for (const [, value] of (html ?? '').matchAll(/font-weight\s*:\s*(\d{3})/gi)) {
    const weight = Number(value)
    if (WEIGHTS.includes(weight)) used.add(weight)
  }

  // A design that never says otherwise still has headings, and a browser
  // synthesising bold from a single weight is the tell of a page built in a
  // hurry.
  if (used.size === 1) used.add(700)

  return [...used].sort((a, b) => a - b)
}

/**
 * Google's css2 endpoint refuses a weight a family does not publish: the whole
 * stylesheet 400s and the face silently does not arrive, which is the failure
 * this file exists to end. So there are two hrefs. The first asks for the
 * weights the design uses; the second asks for nothing at all, which every
 * hosted family answers. `useDesignFonts` falls back to the second on error.
 */
export const googleFontHref = (family: string, weights: number[] = []): string => {
  const name = encodeURIComponent(family).replace(/%20/g, '+')
  const axis = weights.length > 0 ? `:wght@${weights.join(';')}` : ''
  return `https://fonts.googleapis.com/css2?family=${name}${axis}&display=swap`
}

/** The id of the sheet for a family, so the same face is never fetched twice. */
export const fontLinkId = (family: string) =>
  `design-font-${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
