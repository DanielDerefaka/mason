'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAppDispatch } from '@/redux/hooks'
import { resizeGeneratedUI, type Shape } from '@/redux/slice/shapes'
import { DESIGN_SCOPE, designScope, sanitisePartialHtml } from '@/lib/sanitise'
import { cn } from '@/lib/utils'
import { useStyles } from '@/hooks/use-styles'
import { useDesignFonts } from '@/hooks/use-design-fonts'
import { useGoogleFont } from '@/hooks/use-google-font'
import {
  GENERATION_TAKES,
  NOTHING_ARRIVED,
  formatElapsed,
  generationStage,
} from './generation-progress'

/**
 * The generated design.
 *
 * The model writes inline styles that reference the design system through CSS
 * variables, which are bound here. That indirection is what lets one prompt
 * work for any style guide — and it is also why the markup cannot use utility
 * classes: Tailwind compiles the classes it can see at build time, so a class
 * invented at runtime has no rule behind it.
 */
export const GeneratedUI = ({
  shape,
  selected,
  onGrab,
}: {
  shape: Shape
  selected?: boolean
  onGrab?: (event: React.PointerEvent<Element>) => void
}) => {
  const dispatch = useAppDispatch()
  const { styleGuide } = useStyles()
  const containerRef = useRef<HTMLDivElement>(null)

  // The design references var(--font-family); this is what actually fetches it.
  useGoogleFont(
    styleGuide?.typography.fontFamily,
    styleGuide?.typography.styles.map((style) => style.weight) ?? [],
  )

  // And this fetches the faces the design named itself. On /try there is no
  // guide, so the line above is fed undefined and every generation rendered in
  // a fallback stack: the typography the model chose was never once seen.
  useDesignFonts(shape.html)

  // One scope per shape. A canvas holds as many designs as you draw frames
  // for, each with a stylesheet written as if it were the only page in the
  // world; under one shared class the second generation restyled the first.
  const scope = designScope(shape.id)
  const html = useMemo(() => sanitisePartialHtml(shape.html ?? '', scope), [shape.html, scope])

  // How long this design has been on its way. Restarted whenever streaming
  // begins, so a Continue counts from its own click rather than the first
  // one. Seconds, because a page takes most of a minute before the first
  // word and the clock is what says the wait is being spent on something.
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!shape.streaming) return
    const startedAt = Date.now()
    setElapsed(0)
    const tick = setInterval(() => setElapsed(Date.now() - startedAt), 1000)
    return () => clearInterval(tick)
  }, [shape.streaming])

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
      // Grow only. Correcting downwards as well would undo a height the user
      // had just dragged, since the effect reruns on every stored change.
      const measured = node.offsetHeight
      if (measured > shape.height + 10) {
        dispatch(resizeGeneratedUI({ id: shape.id, height: measured }))
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [dispatch, shape.html, shape.height, shape.id])

  return (
    <div
      // Grabbing anywhere on the design moves it. The markup inside is a
      // picture of an interface, not a working one, so there is nothing in
      // there that wants the click more.
      onPointerDown={onGrab}
      // How the /try shell finds this design's DOM to photograph it for a
      // share card: `[data-design-id=<id>] .mason-design`.
      data-design-id={shape.id}
      className={cn(
        'absolute rounded-lg ring-1',
        selected ? 'ring-2 ring-sky-400' : 'ring-white/15',
      )}
      style={{ left: shape.x, top: shape.y, width: shape.width }}
    >
      {/* The caption and every action are drawn by `DesignControls` in
          screen space, so they stay legible at any zoom. They used to be
          drawn here, inside the layer the canvas scales, which made them
          eleven-pixel text at 30% on a canvas reopened at its fitted zoom. */}

      {/* The pill sits over the markup once there is markup; before that the
          placeholder below carries the same stage and clock, and two clocks
          on one panel is noise. */}
      {shape.streaming && shape.html && (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] tabular-nums text-white"
          aria-live="polite"
        >
          <Loader2 className="size-3 animate-spin" />
          {generationStage(shape.html)} · {formatElapsed(elapsed)}
        </div>
      )}

      <div
        ref={containerRef}
        // The design must not swallow the pointer, or the wrapper never sees
        // the drag.
        className="pointer-events-none overflow-hidden rounded-lg"
        style={variables}
      >
        {html ? (
          <div className={`${DESIGN_SCOPE} ${scope}`} dangerouslySetInnerHTML={{ __html: html }} />
        ) : shape.streaming ? (
          <div
            className="grid h-40 place-items-center text-center text-xs text-white/50"
            aria-live="polite"
          >
            <div>
              <p className="flex items-center justify-center gap-1.5 text-sm text-white/80">
                <Loader2 className="size-3.5 animate-spin" />
                {generationStage(shape.html)}
              </p>
              <p className="mt-1 tabular-nums">{formatElapsed(elapsed)}</p>
              <p className="mt-2 text-white/40">{GENERATION_TAKES}</p>
            </div>
          </div>
        ) : (
          <div className="grid h-40 place-items-center px-6 text-center text-xs text-white/40">
            {NOTHING_ARRIVED}
          </div>
        )}
      </div>
    </div>
  )
}

export default GeneratedUI
