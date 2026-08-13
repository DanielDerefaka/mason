'use client'

import { useEffect, useMemo, useRef } from 'react'
import { FileText, Download, FolderDown, Loader2, MessageSquare, PenLine, Smartphone, Workflow } from 'lucide-react'
import { useAppDispatch } from '@/redux/hooks'
import { resizeGeneratedUI, type Shape } from '@/redux/slice/shapes'
import { DESIGN_SCOPE, sanitisePartialHtml } from '@/lib/sanitise'
import { cn } from '@/lib/utils'
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
export const GeneratedUI = ({
  shape,
  selected,
  onGrab,
  onGenerateWorkflow,
  onOpenChat,
  onExport,
  onExportPrompt,
  onExportProject,
  onEdit,
  onMobile,
  mobileRunning,
  workflowRunning,
}: {
  shape: Shape
  selected?: boolean
  onGrab?: (event: React.PointerEvent<Element>) => void
  onGenerateWorkflow?: () => void
  onOpenChat?: () => void
  onExport?: () => void
  /** The design as a build brief, for rebuilding it in another stack. */
  onExportPrompt?: () => void
  /** The design as a Next.js project that runs. */
  onExportProject?: () => void
  onEdit?: () => void
  onMobile?: () => void
  mobileRunning?: boolean
  workflowRunning?: boolean
}) => {
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
      className={cn(
        'absolute rounded-lg ring-1',
        selected ? 'ring-2 ring-sky-400' : 'ring-white/15',
      )}
      style={{ left: shape.x, top: shape.y, width: shape.width }}
    >
      {/* Caption and actions sit above the panel, like a frame's do. */}
      {shape.label && (
        <span className="text-muted-foreground absolute -top-6 left-0 text-[11px]">
          {shape.label}
        </span>
      )}
      {onGenerateWorkflow && !shape.streaming && (
        <div className="absolute -top-7 right-0 flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onGenerateWorkflow}
            disabled={workflowRunning}
            className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.14] hover:text-foreground disabled:opacity-50"
          >
            {workflowRunning ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Building flow…
              </>
            ) : (
              <>
                <Workflow className="size-3" />
                Generate Workflow
              </>
            )}
          </button>
          {onOpenChat && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onOpenChat}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.14] hover:text-foreground"
            >
              <MessageSquare className="size-3" />
              Design Chat
            </button>
          )}
          {onMobile && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onMobile}
              disabled={mobileRunning}
              title="Restructure this design for a phone, as a new design beside it"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] transition-colors hover:bg-white/[0.14] disabled:opacity-50"
            >
              {mobileRunning ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Building…
                </>
              ) : (
                <>
                  <Smartphone className="size-3" />
                  Mobile version
                </>
              )}
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onExport}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.14] hover:text-foreground"
            >
              <Download className="size-3" />
              Export
            </button>
          )}
          {onExportPrompt && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onExportPrompt}
              title="Download a build brief: palette, type scale, structure and rules"
              className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.14] hover:text-foreground"
            >
              <FileText className="size-3" />
              Prompt
            </button>
          )}
          {onExportProject && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onExportProject}
              title="Download a Next.js project: tokens, a component per section, Tailwind"
              className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.14] hover:text-foreground"
            >
              <FolderDown className="size-3" />
              Project
            </button>
          )}
        </div>
      )}

      {/* Edit sits below on its own. The top strip already carries the
          caption and three actions, and this is the one that leaves the
          canvas — worth not burying in a crowded row. */}
      {onEdit && !shape.streaming && (
        <div className="absolute -bottom-8 right-0 flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onEdit}
            title="Open this design in the editor"
            className="text-foreground flex items-center gap-1.5 rounded-full bg-white/[0.14] px-2.5 py-1 text-[11px] transition-colors hover:bg-white/[0.2]"
          >
            <PenLine className="size-3" />
            Edit
          </button>
        </div>
      )}

      {shape.streaming && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] text-white">
          <Loader2 className="size-3 animate-spin" />
          Designing…
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
          <div className={DESIGN_SCOPE} dangerouslySetInnerHTML={{ __html: html }} />
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
