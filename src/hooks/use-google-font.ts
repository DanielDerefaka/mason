'use client'

import { useEffect } from 'react'

/** First family in whatever the model returned, unquoted — it sometimes answers with a stack. */
export const primaryFamily = (fontFamily: string) =>
  (fontFamily.split(',')[0] ?? fontFamily).trim().replace(/^['"]|['"]$/g, '')

/**
 * Pulls a generated family from Google Fonts.
 *
 * Shared by the typography tab and the generated designs on the canvas: both
 * render text in the guide's font, and whichever mounts first loads it. Without
 * it the text silently falls back to the app font, so a design that asked for a
 * serif quietly renders in the wrong face.
 */
export const useGoogleFont = (fontFamily: string | null | undefined, weights: number[]) => {
  const family = fontFamily ? primaryFamily(fontFamily) : null
  const key = weights.join(';')

  useEffect(() => {
    if (!family) return

    const href =
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}` +
      `:wght@${key || '400;700'}&display=swap`

    // One sheet at a time, keyed by href, so switching guides swaps rather than stacks.
    const existing = document.head.querySelector<HTMLLinkElement>('link[data-style-guide-font]')
    if (existing?.href === href) return

    existing?.remove()
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.styleGuideFont = family
    document.head.append(link)
  }, [family, key])

  return family
}
