'use client'

import { ArrowLeft, Loader2, Monitor, Smartphone, Tablet } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useDesignEditor } from '@/hooks/use-design-editor'
import { useWorkspacePath } from '@/hooks/use-workspace-path'
import { buildDesignHtml } from '@/lib/export'
import { cn } from '@/lib/utils'

/**
 * The design as a website, with nothing of ours around it.
 *
 * Read-only on purpose. The editor answers "what is this made of"; this
 * answers "what does it feel like" — and it cannot do that with a layer tree
 * down one side and a property panel down the other.
 *
 * Everything of ours is one slim bar above the frame. It used to float over
 * the top left corner of the design, faded to a quarter until the pointer
 * came near, and the top left corner is where every design keeps its logo
 * and its navigation: the way back sat on the header of the thing being
 * previewed, and reaching for the logo lit up the toolbar instead. Forty
 * pixels of bar cover nothing.
 */

/**
 * A device is a viewport, and a viewport has two dimensions.
 *
 * The heights are the logical screens, not decoration: `100vh`, `100dvh` and
 * a sticky header all resolve against the height, and a preview that gave the
 * design a width and left the height to the window was lying about half of
 * what a phone is.
 */
const DEVICES = [
  { key: 'full', label: 'Full width', width: null, height: null, Icon: Monitor },
  { key: 'tablet', label: 'Tablet', width: 834, height: 1112, Icon: Tablet },
  { key: 'phone', label: 'Phone', width: 390, height: 844, Icon: Smartphone },
] as const

export const DesignPreview = () => {
  const { projectId, design, styleGuide, loading } = useDesignEditor()
  const workspace = useWorkspacePath()
  const [size, setSize] = useState<(typeof DEVICES)[number]['key']>('full')
  const viewport = useRef<HTMLIFrameElement>(null)
  const [overflowing, setOverflowing] = useState(false)

  const back = `${workspace}/editor?project=${projectId ?? ''}&design=${design?.id ?? ''}`
  const device = DEVICES.find((option) => option.key === size)

  /**
   * The design as a whole document, not a fragment on this page.
   *
   * Phone and Tablet used to narrow a `<div>`, and a narrow div is not a
   * narrow screen: `@media (max-width: 768px)` and every `vw` unit resolve
   * against the window and nothing else. So the responsive CSS the model wrote
   * never ran, and the phone view showed a desktop layout crushed into 390px,
   * over a warning that blamed the design for it. The one view that decides
   * whether somebody believes the output was the one view that could not be
   * right.
   *
   * An iframe has a viewport of its own, so 390 by 844 here is 390 by 844 to
   * the CSS. `srcdoc` keeps it on this origin, which is what leaves the
   * document readable from out here and makes the fit measurable.
   *
   * `buildDesignHtml` is the same document the export writes, so this page and
   * the downloaded file can no longer disagree about what the design is.
   */
  const document_ = useMemo(() => {
    if (!design?.html) return ''
    return buildDesignHtml(design, styleGuide ?? null, {
      // Relative paths resolve against this page inside a srcdoc frame, so an
      // empty origin is a no-op rather than a broken URL.
      origin: typeof window === 'undefined' ? '' : window.location.origin,
    })
  }, [design, styleGuide])

  /**
   * Does the design fit the screen it is being shown on?
   *
   * A poll rather than a ResizeObserver, and the sandbox is why. Refusing the
   * frame `allow-scripts` suspends scripting for that document, and with it
   * every observer and listener bound to it: an observer created out here and
   * pointed at the frame's body is never called, not once, and nothing says
   * so. Reading from this side is what still works.
   *
   * It has to keep reading for a while either way. Images decode and fonts
   * swap for seconds after the load event, and a headline in the design's own
   * face is wider than the fallback that stood in for it, which is exactly
   * when a design stops fitting.
   */
  useEffect(() => {
    const frame = viewport.current
    if (!frame || !document_) return

    let timer: ReturnType<typeof setTimeout> | undefined
    let last = -1
    let still = 0

    const read = () => {
      const root = frame.contentDocument?.documentElement
      if (root) {
        const width = root.scrollWidth
        setOverflowing(width > root.clientWidth + 1)
        still = width === last ? still + 1 : 0
        last = width
      }
      // Four seconds of an unchanging page is the end of the loading, not a
      // pause in it.
      if (still < 20) timer = setTimeout(read, 200)
    }

    const restart = () => {
      clearTimeout(timer)
      last = -1
      still = 0
      read()
    }

    restart()
    frame.addEventListener('load', restart)

    return () => {
      frame.removeEventListener('load', restart)
      clearTimeout(timer)
    }
  }, [document_, size])

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

  /**
   * The surround, in the design's own background.
   *
   * The document inside paints itself; this is only what sits around a device,
   * and the app's grey behind a dark design is the tell that you are looking
   * at a preview rather than at a site.
   */
  const background =
    (styleGuide?.colorSections ?? [])
      .flatMap((section) => section.swatches)
      .find((swatch) => swatch.token === '--background')?.color ?? undefined

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0B0B0C]">
      {/* Ours, above the design rather than over it. */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.08] px-2 text-white">
        <Link
          href={back}
          aria-label="Back to the editor"
          title="Back to the editor (Esc)"
          className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          Editor
        </Link>
        <span className="truncate text-[11px] text-white/50">{design.label ?? 'Preview'}</span>

        <div className="ml-auto flex items-center gap-0.5 rounded-md bg-white/[0.06] p-0.5">
          {DEVICES.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-label={option.label}
              aria-pressed={size === option.key}
              title={option.label}
              onClick={() => setSize(option.key)}
              className={cn(
                'grid size-7 place-items-center rounded transition-colors',
                size === option.key
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              )}
            >
              <option.Icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'relative flex min-h-0 flex-1 items-center justify-center overflow-hidden',
          device?.width && 'p-6',
        )}
        style={{ background }}
      >
        <iframe
          ref={viewport}
          title={design.label ?? 'Design preview'}
          srcDoc={document_}
          // No `allow-scripts`: a design is static markup, and the sanitiser
          // already refuses script. `allow-same-origin` is what keeps the
          // document readable from here, which is how the fit above is known.
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
          className={cn(
            'block border-0',
            // A device has edges. Twelve pixels of radius sits under any real
            // content, so nothing of the design is lost to it.
            device?.width && 'rounded-xl shadow-2xl ring-1 ring-black/10',
          )}
          style={{
            width: device?.width ?? '100%',
            height: device?.height ?? '100%',
            // A window shorter than an iPad is a shorter iPad, not a clipped
            // one: the frame stays a real viewport, and the design reflows.
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />

        {overflowing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
            <p className="pointer-events-auto rounded-full bg-amber-500/90 px-3.5 py-2 text-[11px] font-medium text-black shadow-lg">
              This design does not fit a {device?.width}px screen. Open it in the editor, select
              the outermost group and press <span className="font-semibold">Make responsive</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DesignPreview
