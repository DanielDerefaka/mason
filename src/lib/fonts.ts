/**
 * Making sure a design's font actually arrives.
 *
 * The style guide asks the model for a family "available on Google Fonts", and
 * nothing checked that it was. When the answer was a commercial face — and the
 * references worth copying are full of them — the stylesheet request 404s, the
 * browser falls back to the app font, and the design renders in the wrong
 * typeface with no error anywhere. It reads as the model being bad at
 * identifying type when it was often right and simply named something Google
 * does not host.
 *
 * Two parts: name the nearest thing Google does host, then verify it loads.
 */

/**
 * Commercial faces and the Google family closest to them.
 *
 * Chosen on letterform rather than vibe: matching a neo-grotesque to another
 * neo-grotesque of similar x-height and terminal treatment keeps a layout's
 * rhythm even though the face is not the same. A wrong-category substitute —
 * a geometric sans for a transitional serif — changes the design more than a
 * near-miss within the category ever does.
 */
export const NEAREST_GOOGLE: Record<string, string> = {
  // Neo-grotesques: the default voice of most modern product design.
  'söhne': 'Inter',
  'sohne': 'Inter',
  'neue haas grotesk': 'Inter',
  'helvetica now': 'Inter',
  'helvetica neue': 'Inter',
  helvetica: 'Inter',
  'suisse intl': 'Inter',
  suisse: 'Inter',
  'aeonik': 'Manrope',
  'gt america': 'Archivo',
  'gt walsheim': 'Poppins',
  graphik: 'Inter',
  'basis grotesque': 'Inter',
  'founders grotesk': 'Inter',
  'national 2': 'Inter',
  'akzidenz grotesk': 'Inter',
  maison: 'Inter',
  'maison neue': 'Inter',
  circular: 'Manrope',
  'circular std': 'Manrope',
  'tt commons': 'Manrope',
  'sf pro': 'Inter',
  'sf pro display': 'Inter',
  'segoe ui': 'Inter',
  // Geometrics.
  futura: 'Jost',
  'futura pt': 'Jost',
  avenir: 'Nunito Sans',
  'avenir next': 'Nunito Sans',
  gilroy: 'Poppins',
  'proxima nova': 'Montserrat',
  // Serifs.
  canela: 'Playfair Display',
  tiempos: 'Lora',
  'tiempos text': 'Lora',
  freight: 'Bitter',
  'freight text': 'Bitter',
  'gt sectra': 'Playfair Display',
  ogg: 'Playfair Display',
  'romie': 'Playfair Display',
  garamond: 'EB Garamond',
  'adobe garamond': 'EB Garamond',
  caslon: 'Libre Caslon Text',
  didot: 'Playfair Display',
  bodoni: 'Bodoni Moda',
  // Monospace.
  'gt pressura mono': 'Space Mono',
  'jetbrains mono': 'JetBrains Mono',
  'sf mono': 'IBM Plex Mono',
  menlo: 'IBM Plex Mono',
  monaco: 'IBM Plex Mono',
}

/** When nothing else is known, this is the safe neutral. */
export const FALLBACK_FONT = 'Inter'

/** First family in whatever came back, unquoted — the model sometimes answers with a stack. */
export const primaryFamily = (fontFamily: string) =>
  (fontFamily.split(',')[0] ?? fontFamily).trim().replace(/^['"]|['"]$/g, '')

const googleCssUrl = (family: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400&display=swap`

/**
 * Does Google actually host this family?
 *
 * The CSS endpoint answers 400 for a family it does not have, which is a
 * cheaper and more current check than shipping a list of every Google font and
 * watching it go stale.
 */
export const googleFontExists = async (family: string): Promise<boolean> => {
  try {
    const response = await fetch(googleCssUrl(family), {
      // Google serves different CSS per client; without a browser-ish agent it
      // answers with a stripped sheet that is harder to tell apart from an error.
      headers: { 'user-agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
    })
    return response.ok
  } catch {
    // A network failure is not evidence the font is wrong, and refusing a
    // legitimate family because Google was briefly unreachable would be worse
    // than letting it through.
    return true
  }
}

/**
 * The family a design should actually be set in.
 *
 * Resolution order: the name as given if Google hosts it, then the nearest
 * mapped equivalent for a commercial face, then Inter. Never returns something
 * that will not load.
 */
export const resolveFont = async (
  requested: string | null | undefined,
): Promise<{ family: string; substituted: boolean }> => {
  const name = requested ? primaryFamily(requested) : ''
  if (!name) return { family: FALLBACK_FONT, substituted: true }

  const mapped = NEAREST_GOOGLE[name.toLowerCase()]
  if (mapped) return { family: mapped, substituted: true }

  if (await googleFontExists(name)) return { family: name, substituted: false }

  return { family: FALLBACK_FONT, substituted: true }
}
