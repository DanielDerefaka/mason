'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useAppDispatch } from '@/redux/hooks'
import { resizeGeneratedUI, type Shape } from '@/redux/slice/shapes'
import { sanitisePartialHtml } from '@/lib/sanitise'
import { useStyles } from '@/hooks/use-styles'
import { useGoogleFont } from '@/hooks/use-google-font'

/**
 * The generated design.
 *
 * The model writes inline styles that reference the design system through CSS
 * variables, which are bound here. That indirection is what lets one prompt
 * work for any style guide — and it is also why the markup cannot use utility
 * classes: Tailwind compiles the classes it can see at build time, so a class
 * invented at runtime has no rule behind it.
 */
export const GeneratedUI = ({ shape }: { shape: Shape }) => {
  const dispatch = useAppDispatch()
  const { styleGuide } = useStyles()
  const containerRef = useRef<HTMLDivElement>(null)

  // The design references var(--font-family); this is what actually fetches it.
  useGoogleFont(
    styleGuide?.typography.fontFamily,
    styleGuide?.typography.styles.map((style) => style.weight) ?? [],
  )

  const html = useMemo(() => sanitisePartialHtml(shape.html ?? ''), [shape.html])

  const variables = useMemo(() => {
    const vars: Record<string, string> = {}
    for (const section of styleGuide?.colorSections ?? []) {
      for (const swatch of section.swatches) vars[swatch.token] = swatch.color
    }
    if (styleGuide) vars['--font-family'] = styleGuide.typography.fontFamily
    return vars as React.CSSProperties
  }, [styleGuide])

  // Grow the shape to fit its content. Deferred a tick because the markup has
  // to lay out before offsetHeight means anything.
  useEffect(() => {
    const node = containerRef.current
    if (!node || !shape.html) return

    const timer = setTimeout(() => {
      const measured = node.offsetHeight
      if (measured > 0 && Math.abs(measured - shape.height) > 10) {
        dispatch(resizeGeneratedUI({ id: shape.id, height: measured }))
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [dispatch, shape.html, shape.height, shape.id])

  return (
    <div
      className="absolute overflow-hidden rounded-lg ring-1 ring-white/15"
      style={{ left: shape.x, top: shape.y, width: shape.width }}
    >
      {shape.streaming && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] text-white">
          <Loader2 className="size-3 animate-spin" />
          Designing…
        </div>
      )}

      <div ref={containerRef} style={variables}>
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="grid h-40 place-items-center text-xs text-white/40">
            Waiting for the first chunk…
          </div>
        )}
      </div>
    </div>
  )
}

export default GeneratedUI
