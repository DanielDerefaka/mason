import { z } from 'zod'

/**
 * The schema is the contract with the model as well as with the UI, so the
 * descriptions matter — they are sent along with the shape and are part of how
 * the model decides what to put in each field.
 */
export const ColorSwatchSchema = z.object({
  name: z.string().describe('Human label, e.g. "Primary Foreground".'),
  token: z.string().describe('CSS custom property this fills, e.g. "--background".'),
  color: z.string().describe('6-digit hex, e.g. "#1A1A1A".'),
  description: z.string().optional().describe('Where this colour should be used.'),
})

export const ColorSectionSchema = z.object({
  title: z.string(),
  swatches: z.array(ColorSwatchSchema),
})

export const TypographyStyleSchema = z.object({
  name: z.string().describe('Weight name, e.g. "Semi Bold".'),
  weight: z.number().describe('Numeric CSS weight, e.g. 600.'),
})

export const StyleGuideSchema = z.object({
  theme: z.string().describe('Two or three word name for the direction, title case.'),
  description: z.string().describe('One sentence on the feeling it creates.'),
  colorSections: z.array(ColorSectionSchema),
  typography: z.object({
    fontFamily: z.string().describe('Exact Google Fonts family name.'),
    styles: z.array(TypographyStyleSchema),
  }),
})

export type ColorSwatch = z.infer<typeof ColorSwatchSchema>
export type ColorSection = z.infer<typeof ColorSectionSchema>
export type TypographyStyle = z.infer<typeof TypographyStyleSchema>
export type StyleGuide = z.infer<typeof StyleGuideSchema>

/**
 * The built-in theme. Its swatches carry no hex because they are read back from
 * the live stylesheet at render time — only a generated guide stores colours.
 */
export type StaticStyleGuide = Omit<StyleGuide, 'colorSections'> & {
  colorSections: Array<{
    title: string
    swatches: Array<Omit<ColorSwatch, 'color'>>
  }>
}
