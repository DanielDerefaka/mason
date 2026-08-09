'use client'

import type { StyleGuide } from '@/types/style-guide'
import { useGoogleFont } from '@/hooks/use-google-font'
import { SPECIMEN, STYLE_GUIDE } from './config'

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
