import type { CSSProperties } from 'react'

import type { Shape } from '@/redux/slice/shapes'

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
