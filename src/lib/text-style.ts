import type { CSSProperties } from 'react'

import type { Shape, ShapeKind } from '@/redux/slice/shapes'

/**
 * Typography for a text shape.
 *
 * Stored as a partial on the shape and merged over `DEFAULT_TEXT_STYLE` at
 * render time, so every text shape drawn before this existed still renders,
 * and a shape only carries the properties someone actually changed.
 */
export type TextStyle = {
  fontFamily: string
  fontSize: number
  fontWeight: number
  italic: boolean
  underline: boolean
  strike: boolean
  /** Unitless multiplier, the way CSS wants it. */
  lineHeight: number
  /** Pixels — the inspector shows it as px, so it is stored as px. */
  letterSpacing: number
  color: string
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 400,
  italic: false,
  underline: false,
  strike: false,
  lineHeight: 1.2,
  letterSpacing: 0,
  color: '#ffffff',
}

/**
 * Families offered in the picker. Inter is the app's own face and needs no
 * fetch; the rest are pulled from Google Fonts on selection.
 */
export const TEXT_FONTS = [
  'Inter',
  'Manrope',
  'Outfit',
  'DM Sans',
  'Space Grotesk',
  'Playfair Display',
  'Fraunces',
  'Lora',
  'Instrument Serif',
  'IBM Plex Mono',
] as const

/** Weights the slider can land on — the set Google reliably serves. */
export const TEXT_WEIGHTS = [300, 400, 500, 600, 700, 800] as const

export const MIN_FONT_SIZE = 8
export const MAX_FONT_SIZE = 96

export const textStyleOf = (shape: Shape): TextStyle => ({
  ...DEFAULT_TEXT_STYLE,
  ...shape.text,
})

/** `bold` is not stored — it is the weight, so the toggle and slider agree. */
export const isBold = (style: TextStyle) => style.fontWeight >= 600

export const cssForTextStyle = (style: TextStyle): CSSProperties => ({
  fontFamily: `'${style.fontFamily}', ui-sans-serif, system-ui, sans-serif`,
  fontSize: style.fontSize,
  fontWeight: style.fontWeight,
  fontStyle: style.italic ? 'italic' : 'normal',
  lineHeight: style.lineHeight,
  letterSpacing: `${style.letterSpacing}px`,
  color: style.color,
  textDecorationLine:
    [style.underline && 'underline', style.strike && 'line-through']
      .filter(Boolean)
      .join(' ') || 'none',
})

/* ------------------------------------------------------------------ *
 * Shape styling
 *
 * Everything a non-text shape can carry beyond its fill. Stored the same
 * way as `TextStyle` — a partial merged over defaults — so shapes drawn
 * before this existed keep rendering.
 * ------------------------------------------------------------------ */

export type ShadowPreset = 'none' | 'soft' | 'medium' | 'strong' | 'glow'

export type ShapeStyle = {
  /** 0–1. Applied to the whole shape, stroke included. */
  opacity: number
  /** Corner radius in px. Ignored by ellipses and stroked paths. */
  radius: number
  strokeColor: string
  /** 0 means no stroke on a filled shape; paths clamp to at least 1. */
  strokeWidth: number
  shadow: ShadowPreset
}

export const DEFAULT_SHAPE_STYLE: ShapeStyle = {
  opacity: 1,
  radius: 8,
  strokeColor: '#ffffff',
  strokeWidth: 0,
  shadow: 'none',
}

export const SHADOW_PRESETS: { value: ShadowPreset; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'soft', label: 'Soft' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' },
  { value: 'glow', label: 'Glow' },
]

/** Swatches for the fill and stroke pickers — the app's own accents first. */
export const SHAPE_SWATCHES = [
  '#7C6BFF',
  '#2563EB',
  '#1FA97B',
  '#D4A62A',
  '#E86A4B',
  '#E2467F',
  '#F4F4F5',
  '#111114',
] as const

export const MAX_SHAPE_RADIUS = 64
export const MAX_STROKE_WIDTH = 12

export const shapeStyleOf = (shape: Shape): ShapeStyle => ({
  ...DEFAULT_SHAPE_STYLE,
  ...shape.style,
})

/**
 * Box shadows for the filled shapes. `glow` keys off the shape's own colour
 * so it reads as the shape lighting its surroundings rather than a grey
 * drop shadow that happens to be large.
 */
export const boxShadowFor = (shadow: ShadowPreset, colour: string): string | undefined => {
  switch (shadow) {
    case 'soft':
      return '0 4px 14px rgba(0,0,0,0.35)'
    case 'medium':
      return '0 10px 28px rgba(0,0,0,0.5)'
    case 'strong':
      return '0 20px 48px rgba(0,0,0,0.65)'
    case 'glow':
      return `0 0 32px 2px ${colour}80`
    default:
      return undefined
  }
}

/** The same presets as an SVG filter, for the stroked paths. */
export const dropShadowFor = (shadow: ShadowPreset, colour: string): string | undefined => {
  switch (shadow) {
    case 'soft':
      return 'drop-shadow(0 2px 5px rgba(0,0,0,0.45))'
    case 'medium':
      return 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))'
    case 'strong':
      return 'drop-shadow(0 8px 18px rgba(0,0,0,0.75))'
    case 'glow':
      return `drop-shadow(0 0 8px ${colour})`
    default:
      return undefined
  }
}

/** Shapes whose corners can actually be rounded. */
export const HAS_RADIUS: ShapeKind[] = ['rectangle', 'frame', 'generated-ui']
/** Shapes drawn as an SVG path — their colour is a stroke, not a fill. */
export const IS_STROKED: ShapeKind[] = ['pencil', 'line', 'arrow']
