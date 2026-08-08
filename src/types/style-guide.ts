export type ColorSwatch = {
  name: string
  /** CSS custom property the swatch previews, e.g. `--background`. */
  token: string
  description?: string
}

export type ColorSection = {
  title: string
  swatches: ColorSwatch[]
}

export type TypographyStyle = {
  name: string
  weight: number
}

export type StyleGuide = {
  theme: string
  description: string
  colorSections: ColorSection[]
  typography: {
    fontFamily: string
    styles: TypographyStyle[]
  }
}
