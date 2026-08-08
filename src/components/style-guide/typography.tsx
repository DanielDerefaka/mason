'use client'

import { SPECIMEN, STYLE_GUIDE } from './config'

export const Typography = () => {
  const { fontFamily, styles } = STYLE_GUIDE.typography

  return (
    <div className="space-y-10">
      <div className="max-w-md space-y-2">
        <p className="text-sm">Font</p>
        <div className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
          <span className="flex items-center gap-3">
            <span className="text-muted-foreground text-lg leading-none">Aa</span>
            <span className="text-sm">{fontFamily}</span>
          </span>
        </div>
      </div>

      <div className="space-y-7">
        {styles.map((style) => (
          <div key={style.name} className="space-y-1.5">
            <p className="text-muted-foreground text-xs">{style.name}</p>
            <p
              className="font-display text-2xl leading-snug"
              style={{ fontWeight: style.weight }}
            >
              {SPECIMEN}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
