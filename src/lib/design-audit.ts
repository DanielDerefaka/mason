import {
  DISPLAY_FLOOR,
  DISPLAY_MIN,
  MOTION,
  RADII,
  SECTION_PADDING,
  SLOP_HUES,
} from '@/lib/design-system'

/**
 * Measuring a generated design against the system, rather than admiring it.
 *
 * "Is the output still slop" was, until this file, a matter of opinion — and an
 * opinion formed by looking at one design at a time, which is exactly how a
 * regression in a prompt survives for weeks. Every rule in `design-system.ts`
 * that can be read off the markup is checked here, so the question is answered
 * by a count.
 *
 * Deliberately string-based rather than DOM-based. It runs in the generate
 * route, where there is no `DOMParser`, on markup that has just been streamed
 * and not yet parsed by anything; a check that needed a document could only run
 * in the browser, which is the one place a bad design has already been seen.
 *
 * A false positive is worse here than a missed finding. The log line this feeds
 * is only worth reading while every entry in it is real, so each check below
 * refuses to fire when it cannot be sure — an unparseable value, a size that
 * might be inside a media query, a colour behind a variable.
 */

export type Finding = {
  /** Stable id, so a log line can be counted across generations. */
  rule: string
  /** What is wrong, in the words the system uses. */
  title: string
  /** What was actually found, so a reader can go and look at it. */
  detail: string
}

/* -------------------------------------------------------------------------- */
/* Reading CSS out of a fragment                                              */
/* -------------------------------------------------------------------------- */

/**
 * Removes any block whose `@media` condition is a max-width.
 *
 * Sizes and paddings inside one are the mobile values, and judging a page's
 * display type by its 390px rule would fail every correctly built design. The
 * brace matching is deliberate: a media query holds whole rules, so counting
 * to the matching close is the only way to cut one out.
 */
const withoutNarrowQueries = (css: string): string => {
  let out = ''
  let index = 0

  while (index < css.length) {
    const at = css.indexOf('@media', index)
    if (at === -1) return out + css.slice(index)

    const open = css.indexOf('{', at)
    if (open === -1) return out + css.slice(index)

    const condition = css.slice(at, open)
    if (!/max-width/i.test(condition)) {
      out += css.slice(index, open + 1)
      index = open + 1
      continue
    }

    let depth = 1
    let cursor = open + 1
    while (cursor < css.length && depth > 0) {
      if (css[cursor] === '{') depth += 1
      else if (css[cursor] === '}') depth -= 1
      cursor += 1
    }

    out += css.slice(index, at)
    index = cursor
  }

  return out
}

/**
 * Every declaration block in the fragment: one per `style` attribute, one per
 * rule in the stylesheet.
 *
 * Blocks rather than a flat list of declarations, because most of the checks
 * are about a *combination* — a font-size with the line-height that sits beside
 * it, an uppercase transform with the tracking that goes with it. Flattening
 * loses exactly the thing being measured.
 */
export const declarationBlocks = (html: string, options: { desktopOnly?: boolean } = {}): string[] => {
  const blocks: string[] = []

  // Inline first, and with its own pass: a value ends at a different character
  // inside an attribute than it does inside a rule.
  for (const match of html.matchAll(/style\s*=\s*"([^"]*)"/gi)) blocks.push(match[1])
  for (const match of html.matchAll(/style\s*=\s*'([^']*)'/gi)) blocks.push(match[1])

  for (const sheet of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = options.desktopOnly ? withoutNarrowQueries(sheet[1]) : sheet[1]
    for (const rule of css.matchAll(/\{([^{}]*)\}/g)) blocks.push(rule[1])
  }

  return blocks
}

/** The value of one property in one block, last declaration winning as CSS does. */
const declared = (block: string, property: string): string | null => {
  const pattern = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'gi')
  let value: string | null = null
  for (const match of block.matchAll(pattern)) value = match[1].trim()
  return value
}

/**
 * A CSS length as the pixels it resolves to on a 1440px desktop.
 *
 * `clamp(a, b, c)` resolves to its preferred value bounded by the other two,
 * which for display type is nearly always the cap — so the cap is what a
 * reviewer would measure, and taking the floor instead would fail every
 * correctly built fluid headline. `null` where the value cannot be read at all,
 * which is the answer that makes a check stand down rather than guess.
 */
const VIEWPORT = 1440

export const pixels = (value: string | null): number | null => {
  if (!value) return null
  const text = value.trim().toLowerCase()

  const clamp = text.match(/^clamp\(([^,]+),([^,]+),(.+)\)$/)
  if (clamp) {
    const [min, preferred, max] = [pixels(clamp[1]), pixels(clamp[2]), pixels(clamp[3])]
    if (max === null) return null
    if (preferred === null || min === null) return max
    return Math.min(max, Math.max(min, preferred))
  }

  const min = text.match(/^min\((.+)\)$/)
  if (min) {
    const parts = min[1].split(',').map((part) => pixels(part))
    return parts.every((part) => part !== null) ? Math.min(...(parts as number[])) : null
  }

  const max = text.match(/^max\((.+)\)$/)
  if (max) {
    const parts = max[1].split(',').map((part) => pixels(part))
    return parts.every((part) => part !== null) ? Math.max(...(parts as number[])) : null
  }

  const number = text.match(/^(-?[\d.]+)(px|rem|em|vw|vh|dvh|%)?$/)
  if (!number) return null

  const size = Number(number[1])
  if (!Number.isFinite(size)) return null

  switch (number[2]) {
    case 'rem':
    case 'em':
      return size * 16
    case 'vw':
      return (size / 100) * VIEWPORT
    case 'px':
    case undefined:
      return size
    default:
      // vh, dvh and % depend on a box this file cannot see.
      return null
  }
}

/** Letter-spacing as a fraction of the em, so px and em values compare. */
const trackingEm = (value: string | null, fontSize: number | null): number | null => {
  if (!value) return null
  const text = value.trim().toLowerCase()
  if (text === 'normal') return 0

  const em = text.match(/^(-?[\d.]+)em$/)
  if (em) return Number(em[1])

  const px = text.match(/^(-?[\d.]+)px$/)
  if (px && fontSize) return Number(px[1]) / fontSize

  return null
}

/* -------------------------------------------------------------------------- */
/* Colour                                                                     */
/* -------------------------------------------------------------------------- */

/** Hue in degrees, saturation and lightness as fractions. `null` for anything not a hex. */
export const hsl = (hex: string): { h: number; s: number; l: number } | null => {
  const match = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return null

  const digits =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : match[1]

  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16) / 255)
  const high = Math.max(r, g, b)
  const low = Math.min(r, g, b)
  const spread = high - low
  const l = (high + low) / 2

  if (spread === 0) return { h: 0, s: 0, l }

  const s = spread / (1 - Math.abs(2 * l - 1))
  const h =
    high === r
      ? 60 * (((g - b) / spread) % 6)
      : high === g
        ? 60 * ((b - r) / spread + 2)
        : 60 * ((r - g) / spread + 4)

  return { h: (h + 360) % 360, s, l }
}

const hexes = (text: string): string[] => text.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi) ?? []

/* -------------------------------------------------------------------------- */
/* The checks                                                                 */
/* -------------------------------------------------------------------------- */

type Check = (html: string, blocks: string[], desktop: string[]) => Finding | null

/** The largest type on the page, and the block it was declared in. */
const displayType = (blocks: string[]): { size: number; block: string } | null => {
  let found: { size: number; block: string } | null = null
  for (const block of blocks) {
    const size = pixels(declared(block, 'font-size'))
    if (size !== null && (!found || size > found.size)) found = { size, block }
  }
  return found
}

const timidDisplay: Check = (_html, _blocks, desktop) => {
  const largest = displayType(desktop)
  if (!largest || largest.size >= DISPLAY_MIN) return null
  return {
    rule: 'timid-display',
    title: `The hero line is under ${DISPLAY_MIN}px`,
    detail: `Largest type on the page is ${Math.round(largest.size)}px at a ${VIEWPORT}px viewport. d1 is 128px and d2 is 88px.`,
  }
}

const looseDisplay: Check = (_html, _blocks, desktop) => {
  const offenders: string[] = []
  for (const block of desktop) {
    const size = pixels(declared(block, 'font-size'))
    if (size === null || size <= DISPLAY_FLOOR) continue
    const height = declared(block, 'line-height')
    const ratio = height ? Number(height.replace(/[^\d.]/g, '')) : null
    if (ratio === null || Number.isNaN(ratio)) offenders.push(`${Math.round(size)}px with no line-height`)
    else if (ratio >= 1) offenders.push(`${Math.round(size)}px at ${ratio}`)
  }
  if (offenders.length === 0) return null
  return {
    rule: 'loose-display',
    title: `Line-height is not below 1 above ${DISPLAY_FLOOR}px`,
    detail: `${offenders.slice(0, 3).join(', ')}. Display type sets 0.88.`,
  }
}

const untrackedDisplay: Check = (_html, _blocks, desktop) => {
  const offenders: string[] = []
  for (const block of desktop) {
    const size = pixels(declared(block, 'font-size'))
    if (size === null || size < 48) continue
    const tracking = trackingEm(declared(block, 'letter-spacing'), size)
    if (tracking === null || tracking >= 0) offenders.push(`${Math.round(size)}px`)
  }
  if (offenders.length === 0) return null
  return {
    rule: 'untracked-display',
    title: 'Display type carries no negative tracking',
    detail: `${offenders.slice(0, 3).join(', ')} set without letter-spacing: -0.024em.`,
  }
}

const noMicroLabel: Check = (_html, blocks) => {
  for (const block of blocks) {
    if (!/text-transform\s*:\s*uppercase/i.test(block)) continue
    const size = pixels(declared(block, 'font-size'))
    const tracking = trackingEm(declared(block, 'letter-spacing'), size)
    if (tracking !== null && tracking >= 0.06) return null
  }
  return {
    rule: 'no-micro-label',
    title: 'No spaced uppercase micro-label anywhere on the page',
    detail: 'l1 is 12px uppercase at +0.08em. It is a signature of the category and it is absent.',
  }
}

const oneFamily: Check = (_html, blocks) => {
  const families = new Set<string>()
  for (const block of blocks) {
    const family = declared(block, 'font-family')
    if (!family || family.includes('var(')) continue
    families.add(family.split(',')[0].trim().replace(/^['"]|['"]$/g, '').toLowerCase())
  }
  if (families.size >= 2) return null
  return {
    rule: 'one-family',
    title: 'The page is set in one family',
    detail:
      families.size === 0
        ? 'Nothing but the design system variable, so the display line and the body are the same face.'
        : `Only ${Array.from(families)[0]}. A display face and a body face are the minimum, a mono for labels the preferred third.`,
  }
}

const slopAccent: Check = (html) => {
  const seen = new Set<string>()
  for (const hex of hexes(html)) {
    const colour = hsl(hex)
    if (!colour) continue
    if (colour.s < SLOP_HUES.minSaturation) continue
    if (colour.l < 0.25 || colour.l > 0.8) continue
    if (colour.h >= SLOP_HUES.from && colour.h <= SLOP_HUES.to) seen.add(hex.toLowerCase())
  }
  if (seen.size === 0) return null
  return {
    rule: 'slop-accent',
    title: 'Indigo or violet is doing the accent work',
    detail: `${Array.from(seen).slice(0, 4).join(', ')} sits in the ${SLOP_HUES.from}-${SLOP_HUES.to} degree band. Pick a hue the brief asks for.`,
  }
}

const pureGround: Check = (_html, blocks) => {
  const found = new Set<string>()
  for (const block of blocks) {
    for (const property of ['background', 'background-color']) {
      const value = declared(block, property)?.trim().toLowerCase()
      if (!value) continue
      if (/^(#fff|#ffffff|white)$/.test(value)) found.add('#ffffff')
      if (/^(#000|#000000|black)$/.test(value)) found.add('#000000')
    }
  }
  if (found.size === 0) return null
  return {
    rule: 'pure-ground',
    title: 'A ground is pure white or pure black',
    detail: `${Array.from(found).join(' and ')} used as a background. Off-white between #f0f0f0 and #f6f4ef, or a dark ground with a hue in it.`,
  }
}

const twoHueGradient: Check = (html) => {
  for (const gradient of html.matchAll(/(?:linear|radial|conic)-gradient\(([^()]*(?:\([^()]*\)[^()]*)*)\)/gi)) {
    const hues: number[] = []
    for (const hex of hexes(gradient[1])) {
      const colour = hsl(hex)
      // A transparency ramp of one colour is the permitted form, and a near
      // neutral has no hue worth comparing.
      if (colour && colour.s >= 0.15) hues.push(colour.h)
    }
    for (const a of hues) {
      for (const b of hues) {
        const gap = Math.abs(a - b)
        if (Math.min(gap, 360 - gap) > 30) {
          return {
            rule: 'two-hue-gradient',
            title: 'A gradient runs between two hues',
            detail: `${Math.round(a)} to ${Math.round(b)} degrees. A gradient may only be one colour fading to transparent, as a scrim or an edge fade.`,
          }
        }
      }
    }
  }
  return null
}

const shadows: Check = (_html, blocks) => {
  const found: string[] = []
  for (const block of blocks) {
    const shadow = declared(block, 'box-shadow')
    if (shadow && shadow.trim().toLowerCase() !== 'none') found.push(shadow.trim())
  }
  if (found.length === 0) return null
  return {
    rule: 'box-shadow',
    title: `${found.length} box-shadow${found.length === 1 ? '' : 's'}`,
    detail: 'Separate surfaces with a 1px hairline at 10% ink, or by switching the section ground.',
  }
}

const radius: Check = (_html, blocks) => {
  const values = new Set<number>()
  for (const block of blocks) {
    const size = pixels(declared(block, 'border-radius'))
    if (size !== null && size > 0) values.add(size)
  }
  if (values.size === 0) return null

  const sixteen = values.has(16)
  const uniform = values.size === 1 && !RADII.includes(Array.from(values)[0] as (typeof RADII)[number])
  if (!sixteen && !uniform) return null

  return {
    rule: 'radius',
    title: sixteen ? 'The 16px radius is on the page' : 'One radius on every surface',
    detail: `Found ${Array.from(values).sort((a, b) => a - b).join('px, ')}px. The scale is ${RADII.join(', ')}.`,
  }
}

const threeEqualCards: Check = (html) => {
  const match =
    html.match(/grid-template-columns\s*:\s*repeat\(\s*3\s*,\s*(?:minmax\(\s*0[a-z%]*\s*,\s*)?1fr/i) ??
    html.match(/grid-template-columns\s*:\s*1fr\s+1fr\s+1fr\s*(?:;|"|')/i)
  if (!match) return null
  return {
    rule: 'three-equal-cards',
    title: 'Three equal-width cards in a row',
    detail: `\`${match[0].trim()}\`. Vary the widths, set them as an editorial list with hairlines, or number them.`,
  }
}

const thinSections: Check = (_html, _blocks, desktop) => {
  let deepest = 0
  for (const block of desktop) {
    for (const property of ['padding-top', 'padding-bottom', 'padding-block']) {
      const size = pixels(declared(block, property))
      if (size !== null) deepest = Math.max(deepest, size)
    }
    const shorthand = declared(block, 'padding')
    if (shorthand) {
      const top = pixels(shorthand.trim().split(/\s+(?![^(]*\))/)[0])
      if (top !== null) deepest = Math.max(deepest, top)
    }
  }
  if (deepest >= SECTION_PADDING.desktop) return null
  return {
    rule: 'thin-sections',
    title: `No section breathes to ${SECTION_PADDING.desktop}px`,
    detail: `Deepest vertical padding on the page is ${Math.round(deepest)}px. Sections take ${SECTION_PADDING.desktop}, 272 or nothing.`,
  }
}

const lazyMotion: Check = (_html, blocks) => {
  const found: string[] = []
  for (const block of blocks) {
    for (const property of ['transition', 'transition-timing-function', 'animation']) {
      const value = declared(block, property)
      if (!value) continue
      if (/\ball\b/.test(value) && property === 'transition') found.push(value.trim())
      else if (!/cubic-bezier|steps\(/.test(value) && /\b(ease|ease-in|ease-out|ease-in-out|linear)\b/.test(value))
        found.push(value.trim())
    }
  }
  if (found.length === 0) return null
  return {
    rule: 'lazy-motion',
    title: 'Motion uses the CSS keywords',
    detail: `${found.slice(0, 2).map((value) => `\`${value}\``).join(', ')}. Three durations and named curves: ${MOTION.easings.out}.`,
  }
}

const landscapeOnly: Check = (html, blocks) => {
  const ratios: number[] = []
  for (const block of blocks) {
    const value = declared(block, 'aspect-ratio')
    if (!value) continue
    const fraction = value.match(/^\s*([\d.]+)\s*\/\s*([\d.]+)/)
    if (fraction) ratios.push(Number(fraction[1]) / Number(fraction[2]))
    else if (/^[\d.]+$/.test(value.trim())) ratios.push(Number(value))
  }
  for (const image of html.matchAll(/<img[^>]*\bwidth\s*=\s*"(\d+)"[^>]*\bheight\s*=\s*"(\d+)"/gi)) {
    ratios.push(Number(image[1]) / Number(image[2]))
  }
  if (ratios.length < 2 || ratios.some((ratio) => ratio < 0.95)) return null
  return {
    rule: 'landscape-only',
    title: 'Every image is landscape or square',
    detail: `${ratios.length} ratios, none portrait. At least half should be 3/4, 4/5, 8/11 or a letterbox such as 3/1.`,
  }
}

/**
 * Arrows are deliberately not in this range. `→` in a link is typography, not
 * an emoji, and half the well-built pages in the research use one; a check that
 * fired on those would be ignored within a week and take the other fourteen
 * with it.
 */
const emoji: Check = (html) => {
  const text = html.replace(/<[^>]*>/g, ' ')
  const found = text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}-\u{2B55}\u{FE0F}]/gu)
  if (!found) return null
  return {
    rule: 'emoji',
    title: 'An emoji is standing in for an icon',
    detail: `${Array.from(new Set(found)).slice(0, 6).join(' ')}. Icons are inline SVG with currentColor.`,
  }
}

const CHECKS: Check[] = [
  timidDisplay,
  looseDisplay,
  untrackedDisplay,
  noMicroLabel,
  oneFamily,
  slopAccent,
  pureGround,
  twoHueGradient,
  shadows,
  radius,
  threeEqualCards,
  thinSections,
  lazyMotion,
  landscapeOnly,
  emoji,
]

/** Every rule this file knows how to check, for a test that keeps the two in step. */
export const AUDIT_RULES = [
  'timid-display',
  'loose-display',
  'untracked-display',
  'no-micro-label',
  'one-family',
  'slop-accent',
  'pure-ground',
  'two-hue-gradient',
  'box-shadow',
  'radius',
  'three-equal-cards',
  'thin-sections',
  'lazy-motion',
  'landscape-only',
  'emoji',
] as const

/**
 * What the design got wrong, in the order the system states the rules.
 *
 * An empty array is a design that broke none of them, which is not the same as
 * a good design — none of this measures whether the page is any good, only
 * whether it fell into the fifteen holes that make a page look machine-made.
 */
export const auditDesign = (html: string | null | undefined): Finding[] => {
  if (!html || html.trim().length === 0) return []

  const blocks = declarationBlocks(html)
  const desktop = declarationBlocks(html, { desktopOnly: true })

  return CHECKS.map((check) => check(html, blocks, desktop)).filter((finding): finding is Finding => finding !== null)
}
