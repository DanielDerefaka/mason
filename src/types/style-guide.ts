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

/**
 * One named text style — the row of a type specimen sheet.
 *
 * The old guide gave a family and a list of weight names and nothing else, so
 * every generated screen invented its own sizes and no two agreed. A scale is
 * the single biggest lever on consistency between screens.
 */
export const TypeStyleSchema = z.object({
  name: z.string().describe('Role name, e.g. "Headline H2", "Body", "Caption".'),
  fontSize: z.number().describe('Pixels, e.g. 48.'),
  fontWeight: z.number().describe('Numeric CSS weight the family really publishes.'),
  lineHeight: z.number().describe('Unitless multiplier, e.g. 1.2.'),
  letterSpacing: z.number().describe('Em, e.g. -0.02. Zero for body sizes.'),
  usage: z.string().describe('One short line on where this style is used.'),
})

export const RadiusSchema = z.object({
  name: z.string().describe('e.g. "Small", "Medium", "Large", "Pill".'),
  value: z.number().describe('Pixels. Use 9999 for a pill.'),
})

export const ElevationSchema = z.object({
  name: z.string().describe('e.g. "Resting", "Raised", "Floating".'),
  shadow: z.string().describe('A complete CSS box-shadow value.'),
  usage: z.string().describe('One short line on where this level is used.'),
})

export const StyleGuideSchema = z.object({
  theme: z.string().describe('Two or three word name for the direction, title case.'),
  description: z.string().describe('One sentence on the feeling it creates.'),
  colorSections: z.array(ColorSectionSchema),
  typography: z.object({
    fontFamily: z.string().describe('Exact Google Fonts family name.'),
    styles: z.array(TypographyStyleSchema),
  }),
  /** The type scale. Optional so guides generated before it still parse. */
  typeScale: z.array(TypeStyleSchema).optional(),
  /**
   * The spacing rhythm, in pixels, smallest first. A linear scale a design can
   * be held to — the reference kit's argument is that consistency comes from
   * having few permitted values, not from picking good ones each time.
   */
  spacing: z.array(z.number()).optional(),
  radii: z.array(RadiusSchema).optional(),
  elevation: z.array(ElevationSchema).optional(),
})

export type ColorSwatch = z.infer<typeof ColorSwatchSchema>
export type ColorSection = z.infer<typeof ColorSectionSchema>
export type TypographyStyle = z.infer<typeof TypographyStyleSchema>
export type TypeStyle = z.infer<typeof TypeStyleSchema>
export type Radius = z.infer<typeof RadiusSchema>
export type Elevation = z.infer<typeof ElevationSchema>
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
