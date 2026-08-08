'use client'

import { useEffect, useState } from 'react'
import { STYLE_GUIDE } from './config'

/**
 * Resolves a CSS custom property to a hex string.
 *
 * getComputedStyle hands back whatever colour space the value was authored in
 * — for our oklch tokens Chrome returns `lab(2.75% 0 0)`, which is useless in a
 * style guide. Painting the colour into a 1x1 canvas and reading the pixel back
 * normalises any notation, including alpha, into plain RGB.
 */
const toHex = (value: string, ctx: CanvasRenderingContext2D): string => {
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = '#000'
  ctx.fillStyle = value
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  const hex = `#${[r, g, b].map((n) => (n ?? 0).toString(16).padStart(2, '0')).join('')}`
  return a !== undefined && a < 255 ? `${hex} ${Math.round((a / 255) * 100)}%` : hex
}

const useResolvedTokens = (tokens: string[]) => {
  const key = tokens.join(',')
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const styles = getComputedStyle(document.documentElement)
    const next: Record<string, string> = {}
    for (const token of key.split(',')) {
      const raw = styles.getPropertyValue(token).trim()
      next[token] = raw ? toHex(raw, ctx) : token
    }
    setValues(next)
  }, [key])

  return values
}

export const Colours = () => {
  const tokens = STYLE_GUIDE.colorSections.flatMap((s) => s.swatches.map((w) => w.token))
  const resolved = useResolvedTokens(tokens)

  return (
    <div className="space-y-10">
      <div className="max-w-sm space-y-2">
        <p className="text-sm">Themes</p>
        <div className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 text-sm">
          <span className="flex items-center gap-2.5">
            <span className="size-4 rounded-full border border-white/20 bg-muted" />
            {STYLE_GUIDE.theme}
          </span>
        </div>
      </div>

      {STYLE_GUIDE.colorSections.map((section) => (
        <section key={section.title} className="space-y-4">
          <h2 className="text-muted-foreground text-sm">{section.title}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {section.swatches.map((swatch) => (
              <div key={swatch.name} className="flex items-center gap-3">
                <span
                  className="size-10 shrink-0 rounded-md border border-white/10"
                  style={{ background: `var(${swatch.token})` }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm">{swatch.name}</p>
                  <p className="text-muted-foreground truncate font-mono text-xs uppercase">
                    {resolved[swatch.token] ?? ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
