'use client'

import { ArrowLeft, Loader2, Monitor, Smartphone, Tablet } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { useDesignEditor } from '@/hooks/use-design-editor'
import { useGoogleFont } from '@/hooks/use-google-font'
import { sanitiseHtml } from '@/lib/sanitise'
import { cn } from '@/lib/utils'

/**
 * The design as a website, with nothing of ours around it.
 *
 * Read-only on purpose. The editor answers "what is this made of"; this
 * answers "what does it feel like" — and it cannot do that with a layer tree
 * down one side and a property panel down the other.
 *
 * Everything of ours fades out until the pointer comes near it, so a
 * screenshot of this page is a screenshot of the design.
 */
const WIDTHS = [
  { key: 'full', label: 'Full width', width: null, Icon: Monitor },
  { key: 'tablet', label: 'Tablet', width: 834, Icon: Tablet },
  { key: 'phone', label: 'Phone', width: 390, Icon: Smartphone },
] as const

export const DesignPreview = () => {
  const { projectId, design, styleGuide, loading } = useDesignEditor()
  const { session } = useParams<{ session: string }>()
  const [width, setWidth] = useState<(typeof WIDTHS)[number]['key']>('full')

  useGoogleFont(styleGuide?.typography.fontFamily, [300, 400, 500, 600, 700, 800])

  const cssVars = useMemo(() => {
    const vars: Record<string, string> = {}
    for (const section of styleGuide?.colorSections ?? []) {
      for (const swatch of section.swatches) vars[swatch.token] = swatch.color
    }
    if (styleGuide) vars['--font-family'] = styleGuide.typography.fontFamily
    return vars as React.CSSProperties
  }, [styleGuide])

  const back = `/dashboard/${session}/editor?project=${projectId ?? ''}&design=${design?.id ?? ''}`

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.history.back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  }

  if (!design?.html) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Nothing to preview</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            That design is empty or has been deleted.
          </p>
        </div>
      </div>
    )
  }

  const frame = WIDTHS.find((option) => option.key === width)

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      // The design paints its own root, but only inside its column. Without
      // this the page shows the app's background either side of it.
      style={{ ...cssVars, background: 'var(--background)' }}
    >
      {/* overflow-hidden on the device column so content that does not
          reflow is visibly clipped rather than escaping across the page —
          a design that overflows at 390px should look broken here, because
          it is. */}
      <div
        className={cn('mx-auto', frame?.width && 'shadow-2xl', frame?.width && 'overflow-hidden')}
        style={{ width: frame?.width ?? '100%', maxWidth: '100%' }}
      >
        <div dangerouslySetInnerHTML={{ __html: sanitiseHtml(design.html) }} />
      </div>

      {/* Ours, and deliberately almost invisible until reached for. */}
      <div className="group fixed top-4 left-4 z-50 flex items-center gap-1 opacity-25 transition-opacity hover:opacity-100 focus-within:opacity-100">
        <Link
          href={back}
          aria-label="Back to the editor"
          title="Back to the editor (Esc)"
          className="grid size-9 place-items-center rounded-full bg-black/70 text-white backdrop-blur transition-colors hover:bg-black/90"
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div className="flex items-center gap-0.5 rounded-full bg-black/70 p-1 backdrop-blur">
          {WIDTHS.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-label={option.label}
              aria-pressed={width === option.key}
              title={option.label}
              onClick={() => setWidth(option.key)}
              className={cn(
                'grid size-7 place-items-center rounded-full transition-colors',
                width === option.key
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              )}
            >
              <option.Icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DesignPreview
