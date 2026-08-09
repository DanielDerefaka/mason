'use client'

import { useEffect } from 'react'
import type { StyleGuide } from '@/types/style-guide'
import { SPECIMEN, STYLE_GUIDE } from './config'

/** First family in whatever the model returned, unquoted — it sometimes answers with a stack. */
const primaryFamily = (fontFamily: string) =>
  (fontFamily.split(',')[0] ?? fontFamily).trim().replace(/^['"]|['"]$/g, '')

/**
 * Pulls the generated family from Google Fonts. Without this the specimen
 * silently falls back to the app font and every weight looks identical, which
 * reads as the generation having failed.
 */
const useGoogleFont = (fontFamily: string | null, weights: number[]) => {
  const family = fontFamily ? primaryFamily(fontFamily) : null
  const key = weights.join(';')

  useEffect(() => {
    if (!family) return

    const href =
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}` +
      `:wght@${key}&display=swap`

    // Keyed by href so switching guides swaps the sheet instead of stacking them.
    const existing = document.head.querySelector<HTMLLinkElement>(`link[data-style-guide-font]`)
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

export const Typography = ({ guide }: { guide?: StyleGuide | null }) => {
  const { fontFamily, styles } = guide?.typography ?? STYLE_GUIDE.typography
  const family = useGoogleFont(
    guide ? fontFamily : null,
    styles.map((style) => style.weight),
  )

  // The default theme keeps the app font; a generated one names its own.
  const specimenStyle = family ? { fontFamily: `'${family}', sans-serif` } : undefined

  return (
    <div className="space-y-10">
      <div className="max-w-md space-y-2">
        <p className="text-sm">Font</p>
        <div className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
          <span className="flex items-center gap-3">
            <span className="text-muted-foreground text-lg leading-none" style={specimenStyle}>
              Aa
            </span>
            <span className="text-sm">{family ?? fontFamily}</span>
          </span>
        </div>
      </div>

      <div className="space-y-7">
        {styles.map((style) => (
          <div key={`${style.name}-${style.weight}`} className="space-y-1.5">
            <p className="text-muted-foreground text-xs">
              {style.name} {style.weight}
            </p>
            <p
              className={family ? 'text-2xl leading-snug' : 'font-display text-2xl leading-snug'}
              style={{ ...specimenStyle, fontWeight: style.weight }}
            >
              {SPECIMEN}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
