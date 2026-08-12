/**
 * Inline styles as Tailwind classes.
 *
 * A generated design is inline-styled HTML, and an exported project full of
 * `style={{}}` reads like the artefact rather than like something anybody
 * would have written. Translating is the difference between handing over a
 * paste and handing over a codebase.
 *
 * Two rules keep the translation from being the lossy thing it usually is.
 * A named utility is only used where the number matches Tailwind's scale
 * exactly — `padding: 24px` is `p-6` because `p-6` *is* 24px, and
 * `padding: 26px` is `p-[26px]` rather than the nearest step. And anything
 * with no utility form at all survives as a declaration in a style prop
 * instead of being dropped. The exported page therefore renders exactly like
 * the design; what varies is only how much of it reads as Tailwind.
 *
 * The scale names are Tailwind v4's, which is safe because the export writes
 * the project's own `package.json` and pins v4 there.
 */

export type Translation = {
  classes: string[]
  /** Declarations with no utility form, for a style prop. */
  leftover: Record<string, string>
}

/** Arbitrary values may not contain spaces; underscores stand in for them. */
const arbitrary = (value: string) => value.trim().replace(/\s+/g, '_')

const px = (value: string): number | null => {
  const trimmed = value.trim()
  if (/^-?[\d.]+px$/.test(trimmed)) return Number.parseFloat(trimmed)
  if (/^-?[\d.]+rem$/.test(trimmed)) return Number.parseFloat(trimmed) * 16
  if (/^0$/.test(trimmed)) return 0
  return null
}

/**
 * Tailwind's spacing scale, which is `n * 4px` with a few halves at the
 * bottom. Anything off the scale keeps its measurement.
 */
const STEPS = new Set([
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36,
  40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
])

const spacing = (value: string): string => {
  const size = px(value)
  if (size === null) return `[${arbitrary(value)}]`
  if (size === 0) return '0'

  const step = size / 4
  const negative = step < 0 ? '-' : ''
  if (STEPS.has(Math.abs(step))) return `${negative}${Math.abs(step)}`
  return `[${size}px]`
}

/** Sizes take the spacing scale plus the keywords only sizes have. */
const size = (value: string, axis: 'w' | 'h'): string => {
  const trimmed = value.trim()
  if (trimmed === 'auto') return 'auto'
  if (trimmed === '100%') return 'full'
  if (trimmed === 'fit-content') return 'fit'
  if (trimmed === 'min-content') return 'min'
  if (trimmed === 'max-content') return 'max'
  if (trimmed === (axis === 'w' ? '100vw' : '100vh')) return 'screen'
  if (/^\d+%$/.test(trimmed)) {
    // A percentage that is a clean fraction reads better as one.
    const FRACTIONS: Record<string, string> = {
      '50%': '1/2',
      '25%': '1/4',
      '75%': '3/4',
      '20%': '1/5',
      '40%': '2/5',
      '60%': '3/5',
      '80%': '4/5',
    }
    return FRACTIONS[trimmed] ?? `[${trimmed}]`
  }
  const measured = px(trimmed)
  if (measured === null) return `[${arbitrary(trimmed)}]`
  return spacing(trimmed)
}

const FONT_SIZES: Record<number, string> = {
  12: 'xs',
  14: 'sm',
  16: 'base',
  18: 'lg',
  20: 'xl',
  24: '2xl',
  30: '3xl',
  36: '4xl',
  48: '5xl',
  60: '6xl',
  72: '7xl',
  96: '8xl',
  128: '9xl',
}

const WEIGHTS: Record<string, string> = {
  '100': 'thin',
  '200': 'extralight',
  '300': 'light',
  '400': 'normal',
  '500': 'medium',
  '600': 'semibold',
  '700': 'bold',
  '800': 'extrabold',
  '900': 'black',
}

const RADII: Record<number, string> = {
  0: 'none',
  2: 'xs',
  4: 'sm',
  6: 'md',
  8: 'lg',
  12: 'xl',
  16: '2xl',
  24: '3xl',
  32: '4xl',
}

const radius = (value: string): string => {
  const measured = px(value)
  if (measured === null) return `-[${arbitrary(value)}]`
  if (measured >= 9999) return '-full'
  const named = RADII[measured]
  return named ? (named === 'none' ? '-none' : `-${named}`) : `-[${measured}px]`
}

/** A word-for-word mapping, for properties whose values are keywords. */
const KEYWORDS: Record<string, Record<string, string>> = {
  display: {
    flex: 'flex',
    'inline-flex': 'inline-flex',
    grid: 'grid',
    'inline-grid': 'inline-grid',
    block: 'block',
    'inline-block': 'inline-block',
    inline: 'inline',
    none: 'hidden',
    contents: 'contents',
  },
  'flex-direction': {
    row: 'flex-row',
    'row-reverse': 'flex-row-reverse',
    column: 'flex-col',
    'column-reverse': 'flex-col-reverse',
  },
  'flex-wrap': { wrap: 'flex-wrap', nowrap: 'flex-nowrap', 'wrap-reverse': 'flex-wrap-reverse' },
  'align-items': {
    center: 'items-center',
    'flex-start': 'items-start',
    start: 'items-start',
    'flex-end': 'items-end',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  },
  'align-self': {
    auto: 'self-auto',
    center: 'self-center',
    'flex-start': 'self-start',
    'flex-end': 'self-end',
    stretch: 'self-stretch',
    baseline: 'self-baseline',
  },
  'justify-content': {
    center: 'justify-center',
    'flex-start': 'justify-start',
    start: 'justify-start',
    'flex-end': 'justify-end',
    end: 'justify-end',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
  },
  'text-align': {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  },
  'text-transform': {
    uppercase: 'uppercase',
    lowercase: 'lowercase',
    capitalize: 'capitalize',
    none: 'normal-case',
  },
  'font-style': { italic: 'italic', normal: 'not-italic' },
  'text-decoration-line': {
    underline: 'underline',
    'line-through': 'line-through',
    none: 'no-underline',
  },
  position: {
    static: 'static',
    relative: 'relative',
    absolute: 'absolute',
    fixed: 'fixed',
    sticky: 'sticky',
  },
  overflow: {
    hidden: 'overflow-hidden',
    auto: 'overflow-auto',
    scroll: 'overflow-scroll',
    visible: 'overflow-visible',
    clip: 'overflow-clip',
  },
  'object-fit': {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down',
  },
  cursor: { pointer: 'cursor-pointer', default: 'cursor-default', 'not-allowed': 'cursor-not-allowed' },
  'white-space': { nowrap: 'whitespace-nowrap', pre: 'whitespace-pre', normal: 'whitespace-normal' },
  'list-style-type': { none: 'list-none', disc: 'list-disc', decimal: 'list-decimal' },
  'flex-grow': { '0': 'grow-0', '1': 'grow' },
  'flex-shrink': { '0': 'shrink-0', '1': 'shrink' },
  // Solid is Tailwind's default, so saying so adds a class that changes
  // nothing; every other style has to be stated.
  'border-style': {
    solid: '',
    none: 'border-none',
    hidden: 'border-none',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
    double: 'border-double',
  },
  'box-sizing': { 'border-box': 'box-border', 'content-box': 'box-content' },
}

/** Properties whose value is a length that takes the spacing scale. */
const SPACED: Record<string, string> = {
  padding: 'p',
  'padding-top': 'pt',
  'padding-right': 'pr',
  'padding-bottom': 'pb',
  'padding-left': 'pl',
  margin: 'm',
  'margin-top': 'mt',
  'margin-right': 'mr',
  'margin-bottom': 'mb',
  'margin-left': 'ml',
  gap: 'gap',
  'row-gap': 'gap-y',
  'column-gap': 'gap-x',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
}

const SIZED: Record<string, { prefix: string; axis: 'w' | 'h' }> = {
  width: { prefix: 'w', axis: 'w' },
  height: { prefix: 'h', axis: 'h' },
  'min-width': { prefix: 'min-w', axis: 'w' },
  'min-height': { prefix: 'min-h', axis: 'h' },
  'max-width': { prefix: 'max-w', axis: 'w' },
  'max-height': { prefix: 'max-h', axis: 'h' },
}

const CORNERS: Record<string, string> = {
  'border-top-left-radius': 'rounded-tl',
  'border-top-right-radius': 'rounded-tr',
  'border-bottom-right-radius': 'rounded-br',
  'border-bottom-left-radius': 'rounded-bl',
}

const BORDER_SIDES: Record<string, string> = {
  'border-top-width': 'border-t',
  'border-right-width': 'border-r',
  'border-bottom-width': 'border-b',
  'border-left-width': 'border-l',
}

const BORDER_COLOURS: Record<string, string> = {
  'border-top-color': 'border-t',
  'border-right-color': 'border-r',
  'border-bottom-color': 'border-b',
  'border-left-color': 'border-l',
}

/**
 * Declarations that describe the design rather than change it, or that
 * Tailwind expresses so differently that a translation would be a guess. They
 * are dropped rather than kept: a border style of `none` on an element with no
 * border, or a `border-color` on one with no width, says nothing.
 */
const NOISE = new Set<string>([])

/** A declaration that says nothing, as distinct from one with no utility. */
const DROP = Symbol('drop')

const one = (property: string, value: string): string | null | typeof DROP => {
  const clean = value.trim()
  if (!clean) return null

  const keyword = KEYWORDS[property]?.[clean]
  if (keyword) return keyword
  // A mapping to nothing is deliberate — the declaration is already the default.
  if (keyword === '') return DROP

  if (SPACED[property]) {
    if (clean === 'auto') return `${SPACED[property]}-auto`
    return `${SPACED[property]}-${spacing(clean)}`
  }

  if (SIZED[property]) {
    const { prefix, axis } = SIZED[property]
    return `${prefix}-${size(clean, axis)}`
  }

  switch (property) {
    case 'color':
      return `text-[${arbitrary(clean)}]`
    case 'background-color':
      return clean === 'transparent' ? 'bg-transparent' : `bg-[${arbitrary(clean)}]`
    case 'background-image':
      return clean === 'none' ? DROP : `bg-[image:${arbitrary(clean)}]`
    case 'background':
      return `bg-[${arbitrary(clean)}]`
    case 'font-size': {
      const measured = px(clean)
      const named = measured !== null ? FONT_SIZES[measured] : undefined
      return named ? `text-${named}` : `text-[${arbitrary(clean)}]`
    }
    case 'font-weight':
      return WEIGHTS[clean] ? `font-${WEIGHTS[clean]}` : `font-[${arbitrary(clean)}]`
    case 'font-family':
      return `font-[${arbitrary(clean)}]`
    case 'line-height':
      return `leading-[${arbitrary(clean)}]`
    case 'letter-spacing':
      return `tracking-[${arbitrary(clean)}]`
    case 'border-radius':
      return `rounded${radius(clean)}`
    case 'border-width': {
      const measured = px(clean)
      if (measured === 0) return 'border-0'
      return measured === 1 ? 'border' : `border-[${arbitrary(clean)}]`
    }
    case 'border-color':
      return `border-[${arbitrary(clean)}]`
    case 'opacity': {
      const percent = Number.parseFloat(clean) * 100
      return Number.isInteger(percent) ? `opacity-${percent}` : `opacity-[${clean}]`
    }
    case 'box-shadow':
      return clean === 'none' ? 'shadow-none' : `shadow-[${arbitrary(clean)}]`
    case 'z-index':
      return `z-${/^-?\d+$/.test(clean) ? clean : `[${clean}]`}`
    case 'flex-basis':
      return `basis-${spacing(clean)}`
    case 'flex':
      return clean === '1' || clean === '1 1 0%' ? 'flex-1' : `flex-[${arbitrary(clean)}]`
    case 'aspect-ratio':
      return `aspect-[${arbitrary(clean.replace(/\s*\/\s*/, '/'))}]`
    case 'grid-template-columns': {
      // `repeat(3, 1fr)` and `1fr 1fr 1fr` are the same three columns, and
      // both are `grid-cols-3`.
      const repeat = /^repeat\(\s*(\d+)\s*,\s*(?:minmax\(0(?:px)?,\s*)?1fr\)?\s*\)$/.exec(clean)
      if (repeat) return `grid-cols-${repeat[1]}`
      const columns = clean.split(/\s+/)
      if (columns.length > 0 && columns.every((column) => column === '1fr')) {
        return `grid-cols-${columns.length}`
      }
      return `grid-cols-[${arbitrary(clean)}]`
    }
    case 'text-overflow':
      return clean === 'ellipsis' ? 'text-ellipsis' : DROP
    case 'text-decoration':
      return KEYWORDS['text-decoration-line'][clean] ?? DROP
    default:
      break
  }

  if (CORNERS[property]) return `${CORNERS[property]}${radius(clean)}`

  if (BORDER_SIDES[property]) {
    const measured = px(clean)
    if (measured === 0) return `${BORDER_SIDES[property]}-0`
    return measured === 1 ? BORDER_SIDES[property] : `${BORDER_SIDES[property]}-[${clean}]`
  }

  if (BORDER_COLOURS[property]) return `${BORDER_COLOURS[property]}-[${arbitrary(clean)}]`

  return null
}

/**
 * Collapses the four sides back into one class where they agree.
 *
 * The editor writes per-side padding, so a design that looks like `p-6`
 * arrives as four declarations. Emitting `pt-6 pr-6 pb-6 pl-6` is correct and
 * unreadable, which is the failure mode this translation exists to avoid.
 */
/** Splits a value on spaces that are not inside a function. */
const words = (value: string): string[] => {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of value.trim()) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (/\s/.test(char) && depth === 0) {
      if (current) parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current) parts.push(current)
  return parts
}

const BORDER_STYLES = new Set(['none', 'hidden', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge'])

/**
 * Shorthands, expanded into the longhands the table below knows.
 *
 * `padding: 0 48px 96px` has no single utility, and left whole it becomes an
 * arbitrary value nobody would write. Expanded, it is three sides, and
 * `collapse` folds them straight back into `px-12 pt-0 pb-24`. Borders are the
 * same story: `border: 1px solid var(--border)` is a width, a style and a
 * colour pretending to be one declaration.
 */
const expand = (declarations: Record<string, string>): Record<string, string> => {
  const next: Record<string, string> = {}

  for (const [property, value] of Object.entries(declarations)) {
    const box = /^(padding|margin)$/.exec(property)
    if (box) {
      const parts = words(value)
      if (parts.length > 1) {
        const [top, right, bottom = top, left = right] = parts
        next[`${box[1]}-top`] = top
        next[`${box[1]}-right`] = right
        next[`${box[1]}-bottom`] = bottom
        next[`${box[1]}-left`] = left
        continue
      }
    }

    const border = /^border(-(top|right|bottom|left))?$/.exec(property)
    if (border) {
      const prefix = border[2] ? `border-${border[2]}` : 'border'
      for (const part of words(value)) {
        if (BORDER_STYLES.has(part)) next[`${prefix}-style`] = part
        else if (px(part) !== null) next[`${prefix}-width`] = part
        else next[`${prefix}-color`] = part
      }
      continue
    }

    next[property] = value
  }

  return next
}

const BOXES = [
  { shorthand: 'padding', prefix: 'p' },
  { shorthand: 'margin', prefix: 'm' },
] as const

const collapse = (declarations: Record<string, string>): Record<string, string> => {
  const next = { ...declarations }

  for (const { shorthand, prefix } of BOXES) {
    const sides = ['top', 'right', 'bottom', 'left'].map((side) => `${shorthand}-${side}`)
    if (!sides.every((side) => next[side] !== undefined)) continue

    const [top, right, bottom, left] = sides.map((side) => next[side])
    const vertical = top === bottom
    const horizontal = right === left
    if (!vertical && !horizontal) continue

    if (vertical && horizontal && top === right) {
      next[shorthand] = top
      for (const side of sides) delete next[side]
      continue
    }
    if (vertical) {
      next[`${prefix}y-axis`] = top
      delete next[sides[0]]
      delete next[sides[2]]
    }
    if (horizontal) {
      next[`${prefix}x-axis`] = right
      delete next[sides[1]]
      delete next[sides[3]]
    }
  }

  return next
}

/** The synthetic axis keys `collapse` introduces, mapped to their prefix. */
const AXIS_KEYS: Record<string, string> = {
  'py-axis': 'py',
  'px-axis': 'px',
  'my-axis': 'my',
  'mx-axis': 'mx',
}

export const toTailwind = (declarations: Record<string, string>): Translation => {
  const classes: string[] = []
  const leftover: Record<string, string> = {}

  for (const [property, value] of Object.entries(collapse(expand(declarations)))) {
    if (NOISE.has(property)) continue

    const axis = AXIS_KEYS[property]
    if (axis) {
      classes.push(value.trim() === 'auto' ? `${axis}-auto` : `${axis}-${spacing(value)}`)
      continue
    }

    const translated = one(property, value)
    if (translated === DROP) continue
    if (translated) classes.push(translated)
    // Nothing is lost silently: what has no utility form keeps rendering from
    // a style prop, so the exported page matches the design either way.
    else if (value.trim()) leftover[property] = value.trim()
  }

  return { classes, leftover }
}

/** `color:red;padding:4px` → `{ color: 'red', padding: '4px' }`. */
export const parseDeclarations = (style: string): Record<string, string> => {
  const declarations: Record<string, string> = {}
  for (const part of splitDeclarations(style)) {
    const colon = part.indexOf(':')
    if (colon === -1) continue
    const property = part.slice(0, colon).trim().toLowerCase()
    const value = part.slice(colon + 1).trim()
    if (property && value) declarations[property] = value
  }
  return declarations
}

/** Splits on semicolons that are not inside a function or a string. */
const splitDeclarations = (style: string): string[] => {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0

  for (let index = 0; index < style.length; index += 1) {
    const char = style[index]
    if (quote) {
      if (char === quote && style[index - 1] !== '\\') quote = null
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    else if (char === ';' && depth === 0) {
      parts.push(style.slice(start, index))
      start = index + 1
    }
  }
  parts.push(style.slice(start))
  return parts.map((part) => part.trim()).filter(Boolean)
}
