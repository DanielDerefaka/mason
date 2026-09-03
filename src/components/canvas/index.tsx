'use client'

import { useEffect, useRef, useState } from 'react'
import { nanoid } from '@reduxjs/toolkit'

import { useCanvasImage } from '@/hooks/use-canvas-image'
import { useInfiniteCanvas } from '@/hooks/use-canvas'
import type { Shape, Tool, Viewport } from '@/redux/slice/shapes'
import type { ResizeHandle } from '@/hooks/use-canvas'
import { cn } from '@/lib/utils'
import {
  Download,
  FileText,
  FolderDown,
  Layers as LayersIcon,
  Loader2,
  MessageSquare,
  PenLine,
  Smartphone,
  Sparkles,
  Wand2,
  Workflow,
} from 'lucide-react'
import { useFrame } from '@/hooks/use-frame'
import { useWorkflow } from '@/hooks/use-workflow'
import { useMobileVersion } from '@/hooks/use-mobile-version'
import { useAppDispatch, useAppStore } from '@/redux/hooks'
import { shapesAdapter, updateShape, wrapImageInFrame } from '@/redux/slice/shapes'
import { useGuest } from '@/components/try/guest-context'
import { ExploreSwitch } from '@/components/try/explore-switch'
import { GeneratedUI } from './shapes/generated-ui'
import { InspirationSidebar } from './shapes/inspiration-sidebar'
import { DesignChat } from './shapes/design-chat'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWorkspacePath } from '@/hooks/use-workspace-path'
import { useDesignChat } from '@/hooks/use-design-chat'
import { useStyles } from '@/hooks/use-styles'
import {
  exportDesignHtml,
  exportDesignProject,
  exportDesignPrompt,
  exportFramePng,
} from '@/lib/export'
import { toast } from 'sonner'
import { AutoSave } from './autosave'
import { isDrag, pressAt, type Press } from './click-slop'
import { ToolBar } from './toolbar'
import { Inspector, ShapeInspector } from './inspector'
import { ArrangeBar } from './arrange'
import { LayersPanel } from './layers'
import { FramePresetDialog } from './frame-presets'
import { ExploreNotice } from '@/components/try/explore-notice'
import { useCanvasFonts } from '@/hooks/use-canvas-fonts'
import {
  boxShadowFor,
  cssForTextStyle,
  dropShadowFor,
  shapeStyleOf,
  textStyleOf,
} from '@/lib/text-style'

type PointerHandler = (event: React.PointerEvent<Element>) => void

const selectors = shapesAdapter.getSelectors()

/**
 * World units between a placed image and the frame wrapped round it. Enough
 * to read as a page holding a picture rather than a border painted on one,
 * and small enough that the frame is still plainly the image's.
 */
const IMAGE_FRAME_MARGIN = 24

/**
 * Keeps a control's pointerdown away from the shape underneath it. Without
 * this the shape captures the pointer, and a captured pointer sends the
 * following click to the capturing element rather than the button — so the
 * button's onClick never runs.
 */
const stopPointer = (event: React.PointerEvent<Element>) => event.stopPropagation()

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-white/15 bg-white/[0.08] px-1.5 py-0.5 font-sans text-[11px] text-foreground">
    {children}
  </kbd>
)

const ShapeView = ({
  shape,
  selected,
  onGrab,
  onBeginEdit,
  onEndEdit,
  onTextChange,
  editing,
}: {
  shape: Shape
  selected?: boolean
  onGrab?: PointerHandler
  onBeginEdit?: () => void
  onEndEdit?: () => void
  onTextChange?: (value: string, height: number) => void
  editing?: boolean
}) => {
  if (shape.kind === 'generated-ui') {
    // The design's actions are drawn by `DesignControls`, outside the zoomed
    // layer. Handed its callbacks, the panel would draw a second row of its
    // own inside it, at whatever size the zoom made them.
    return <GeneratedUI shape={shape} selected={selected} onGrab={onGrab} />
  }

  const base = 'absolute'
  const style: React.CSSProperties = {
    left: shape.x,
    top: shape.y,
    width: shape.width,
    height: shape.height,
  }

  if (shape.kind === 'frame') {
    // The label and the action pills are `FrameControls`, drawn in screen
    // space; only the page itself lives in the zoomed layer.
    return (
      <div className={base} style={style} onPointerDown={onGrab}>
        <div
          className={cn('size-full rounded-sm ring-1', selected ? 'ring-white/70' : 'ring-white/25')}
          // A frame is a page, and a page has a colour. It used to paint a
          // fixed near-black wash whatever the fill said, so the picker offered
          // a choice that did nothing. The wash is still the default, because
          // an unfilled frame should read as empty canvas rather than as a
          // white rectangle nobody asked for.
          style={{ background: shape.fill === 'transparent' ? 'rgb(255 255 255 / 0.02)' : shape.fill }}
        />
      </div>
    )
  }

  if (shape.kind === 'image') {
    const imageCss = shapeStyleOf(shape)

    // No source at all: draw the box so it can still be selected and removed,
    // and say why it is empty rather than rendering nothing.
    if (!shape.src) {
      return (
        <div
          className={cn(base, 'grid place-items-center rounded-sm border border-dashed border-white/25 text-[11px] text-white/40', selected && 'ring-2 ring-white/80')}
          style={style}
          onPointerDown={onGrab}
        >
          Image unavailable
        </div>
      )
    }

    return (
      // next/image is the wrong tool here: the source is an arbitrary storage
      // URL rather than a configured remote pattern, and the canvas already
      // controls the box the picture is painted into.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={shape.src}
        alt={shape.label ?? ''}
        /**
         * An image with no source, or one that fails to load, renders as
         * nothing at all — the shape is still there and still moves, so it
         * reads as an invisible picture rather than a broken one, and there is
         * nothing on screen or in the console to say which. Both cases now
         * announce themselves.
         */
        onError={() =>
          console.error(
            '[canvas] image failed to load',
            JSON.stringify({ id: shape.id, label: shape.label, src: shape.src ?? null }),
          )
        }
        // Without this the browser starts its own image drag and the canvas
        // never sees the pointer move, so the shape stays where it was.
        draggable={false}
        className={cn(base, 'select-none', selected && 'ring-2 ring-white/80')}
        style={{
          ...style,
          /**
           * The invisible image, and it was never the image.
           *
           * Tailwind's preflight sets `img, video { max-width: 100% }`. The
           * world container is absolutely positioned with no width of its own,
           * and every shape inside it is absolute too — nothing in flow to
           * measure — so it shrink-to-fits to zero. A hundred per cent of zero
           * is zero, and `max-width` clamps the used width however explicit
           * the `width` beside it is: the element laid out 0 wide and its full
           * height, which is why an image was the only shape this could
           * happen to. Everything else on the canvas is a div.
           *
           * It leaves no trace anywhere the existing diagnostics look. The
           * file uploads, the shape is created, `onError` never fires because
           * the picture decoded perfectly — it is simply painted into a box
           * with no width.
           */
          maxWidth: 'none',
          // Crops rather than stretches, the way an image fill behaves in a
          // design tool. Dragging a corner should reframe the picture, not
          // squash whoever is in it.
          objectFit: 'cover',
          opacity: imageCss.opacity,
          borderRadius: imageCss.radius,
          border:
            imageCss.strokeWidth > 0
              ? `${imageCss.strokeWidth}px solid ${imageCss.strokeColor}`
              : undefined,
          boxShadow: boxShadowFor(imageCss.shadow, 'transparent'),
        }}
        // The line that was missing. Every other shape hands its pointer down
        // to the canvas; without it an image could not be selected, and with
        // nothing selected there were no resize grips to drag either.
        onPointerDown={onGrab}
      />
    )
  }

  if (shape.kind === 'pencil' || shape.kind === 'arrow' || shape.kind === 'line') {
    const points = shape.points ?? []
    if (points.length < 2) return null

    // Anchor the svg to the shape's bounding box and draw relative to it. An
    // svg sized 0x0 paints nothing even with overflow visible, and the parent
    // layer has no intrinsic size to inherit from.
    const pad = 8
    const d = points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x - shape.x + pad} ${pt.y - shape.y + pad}`)
      .join(' ')

    return (
      <svg
        className="pointer-events-none absolute"
        style={{
          left: shape.x - pad,
          top: shape.y - pad,
          width: shape.width + pad * 2,
          height: shape.height + pad * 2,
        }}
      >
        <defs>
          <marker
            id={`arrow-${shape.id}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={shape.fill} />
          </marker>
        </defs>
        {/* Invisible fat stroke so thin lines can actually be clicked. The svg
            is pointer-events-none; this child opts back in. */}
        <path
          d={d}
          fill="none"
          stroke="transparent"
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          onPointerDown={onGrab}
        />
        <path
          d={d}
          fill="none"
          stroke={shape.fill}
          strokeWidth={Math.max(1, shapeStyleOf(shape).strokeWidth || 2)}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={shape.kind === 'arrow' ? `url(#arrow-${shape.id})` : undefined}
          opacity={shapeStyleOf(shape).opacity * (selected ? 1 : 0.9)}
          style={{ filter: dropShadowFor(shapeStyleOf(shape).shadow, shape.fill) }}
        />
      </svg>
    )
  }

  if (shape.kind === 'text') {
    const value = shape.label ?? ''
    const textCss = cssForTextStyle(textStyleOf(shape))

    if (editing) {
      return (
        <textarea
          autoFocus
          value={value}
          placeholder="Type something…"
          onChange={(event) => {
            // Grow with the content so a wrapped line is never clipped.
            const field = event.currentTarget
            field.style.height = 'auto'
            const height = Math.max(24, field.scrollHeight)
            field.style.height = `${height}px`
            onTextChange?.(field.value, height)
          }}
          onBlur={onEndEdit}
          onKeyDown={(event) => {
            // Escape commits and leaves; Enter stays, since a text box is a
            // paragraph rather than a single-line field.
            if (event.key === 'Escape') {
              event.preventDefault()
              event.currentTarget.blur()
            }
          }}
          // Stop the canvas turning a caret placement into a drag.
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute resize-none overflow-hidden bg-transparent p-0 outline-none ring-1 ring-sky-400 placeholder:text-white/30"
          style={{ ...style, ...textCss, height: Math.max(shape.height, 24) }}
        />
      )
    }

    return (
      <div
        className={cn(
          base,
          'cursor-text whitespace-pre-wrap',
          selected && 'ring-1 ring-white/70',
        )}
        // The placeholder is dimmed inline rather than with a class, so it
        // does not fight the chosen colour via specificity.
        style={{ ...style, ...textCss, ...(value ? null : { color: 'rgb(255 255 255 / 0.3)' }) }}
        onPointerDown={onGrab}
        onDoubleClick={onBeginEdit}
      >
        {value || 'Type something…'}
      </div>
    )
  }

  const shapeCss = shapeStyleOf(shape)

  return (
    <div
      className={cn(base, selected && 'ring-2 ring-white/80')}
      style={{
        ...style,
        background: shape.fill,
        opacity: shapeCss.opacity,
        // An ellipse is round by definition; everything else takes its radius.
        borderRadius: shape.kind === 'ellipse' ? '9999px' : shapeCss.radius,
        border:
          shapeCss.strokeWidth > 0
            ? `${shapeCss.strokeWidth}px solid ${shapeCss.strokeColor}`
            : undefined,
        boxShadow: boxShadowFor(shapeCss.shadow, shape.fill),
      }}
      onPointerDown={onGrab}
    />
  )
}

/**
 * The frame's name, renameable in place.
 *
 * A frame is created with its preset name — "MacBook Air" — and that name is
 * the only description of the screen anywhere. It is also, now, the only one
 * the generator will accept: a device name is filtered out before the prompt
 * is built, so a frame keeps its size label and tells the model nothing until
 * somebody gives it a real one. Renaming needed to be as cheap as
 * double-clicking it.
 */
const FrameLabel = ({
  shape,
  selected,
  onGrab,
}: {
  shape: Shape
  selected?: boolean
  onGrab?: PointerHandler
}) => {
  const dispatch = useAppDispatch()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(shape.label ?? '')

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== shape.label) {
      dispatch(updateShape({ id: shape.id, changes: { label: next } }))
    } else {
      // An empty name would leave the frame with no handle at all, so the old
      // one stands and the field is put back the way it was.
      setDraft(shape.label ?? '')
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          if (event.key === 'Escape') {
            setDraft(shape.label ?? '')
            setEditing(false)
          }
          // The canvas listens for single keys as tool shortcuts, and every
          // letter typed here would otherwise also swap the active tool.
          event.stopPropagation()
        }}
        // Without this the pointer down starts a drag on the frame underneath
        // and the caret never lands.
        onPointerDown={(event) => event.stopPropagation()}
        className="pointer-events-auto mr-auto w-48 rounded border border-sky-400/60 bg-black/80 px-1 text-xs text-white outline-none"
      />
    )
  }

  if (!shape.label) return null

  return (
    <span
      /**
       * The label is a handle for the frame under it. It used to stop the
       * pointer instead, so the one word that reads as the frame's name was
       * the one place above it that a click did nothing: it neither selected
       * the frame nor moved it. The same grab the frame itself uses selects
       * on press and moves on drag, and the double-click rename still works
       * because a press with no drag is not a move.
       */
      onPointerDown={onGrab}
      onDoubleClick={() => {
        setDraft(shape.label ?? '')
        setEditing(true)
      }}
      title="Double-click to rename"
      className={cn(
        'pointer-events-auto mr-auto max-w-[12rem] cursor-default truncate text-xs transition-colors hover:text-foreground',
        selected ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {shape.label}
    </span>
  )
}

/**
 * Where a world rectangle lands on the canvas, in screen pixels.
 *
 * The world layer is `translate(tx, ty) scale(s)`, so a point at world (x, y)
 * is drawn at (x * s + tx, y * s + ty). Anything positioned from this stays
 * the size it was written at whatever the zoom is.
 */
const screenRect = (shape: Shape, viewport: Viewport) => ({
  left: shape.x * viewport.scale + viewport.translate.x,
  top: shape.y * viewport.scale + viewport.translate.y,
  width: shape.width * viewport.scale,
  height: shape.height * viewport.scale,
})

const pill =
  'pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/[0.14] hover:text-foreground disabled:opacity-50'

/**
 * A control row above a shape, in screen space.
 *
 * The pills used to be children of the shape inside the zoomed layer, at
 * `text-[11px]` that the zoom then multiplied: zoomed out to see a whole
 * page, Generate was a smear seven pixels tall, and zoomed in, a banner. This
 * box is the shape's screen rectangle with nothing painted in it; the row
 * hangs off its top edge at the size the stylesheet says, and wraps upward
 * when the shape on screen is narrower than its controls, so nothing is
 * clipped or stacked on a neighbour. The box itself lets the pointer through,
 * so the frame and the canvas under it still get every click.
 */
const Controls = ({
  shape,
  viewport,
  children,
  below,
}: {
  shape: Shape
  viewport: Viewport
  children: React.ReactNode
  /** Anything that hangs off the bottom edge instead. */
  below?: React.ReactNode
}) => (
  <div className="pointer-events-none absolute" style={screenRect(shape, viewport)}>
    <div className="pointer-events-none absolute inset-x-0 bottom-full mb-1.5 flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
      {children}
    </div>
    {below && (
      // A design's box is allowed to run ten world pixels short of its markup
      // before it is grown to fit, so this clears that as well as the edge.
      <div className="pointer-events-none absolute top-full right-0 mt-3 flex items-center">
        {below}
      </div>
    )}
  </div>
)

const FrameControls = ({
  shape,
  selected,
  viewport,
  generating,
  onGrab,
  onGenerate,
  onInspiration,
  onExport,
}: {
  shape: Shape
  selected: boolean
  viewport: Viewport
  generating: boolean
  onGrab: PointerHandler
  onGenerate: () => void
  onInspiration: () => void
  onExport: () => void
}) => (
  <Controls shape={shape} viewport={viewport}>
    <FrameLabel shape={shape} selected={selected} onGrab={onGrab} />
    <button type="button" onPointerDown={stopPointer} onClick={onInspiration} className={pill}>
      <Sparkles className="size-3.5" />
      Inspiration
    </button>
    <button
      type="button"
      onPointerDown={stopPointer}
      onClick={onGenerate}
      disabled={generating}
      className={pill}
    >
      {generating ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <Wand2 className="size-3.5" />
          Generate
        </>
      )}
    </button>
    <button
      type="button"
      onPointerDown={stopPointer}
      onClick={onExport}
      title="Export this frame as a PNG"
      className={pill}
    >
      <Download className="size-3.5" />
      Export
    </button>
  </Controls>
)

/**
 * The generated design's actions, in screen space like the frame's.
 *
 * Every pill the panel used to draw for itself, with the same rules: nothing
 * while the design is still streaming, every download through the guest gate,
 * and the Next.js project not offered to a guest at all, since an offer
 * withdrawn at the click is worse than one never made. Edit sits below on its
 * own, as before, because it is the one that leaves the canvas.
 */
const DesignControls = ({
  shape,
  viewport,
  workflowRunning,
  mobileRunning,
  onGenerateWorkflow,
  onOpenChat,
  onMobile,
  onExport,
  onExportPrompt,
  onExportProject,
  onEdit,
}: {
  shape: Shape
  viewport: Viewport
  workflowRunning: boolean
  mobileRunning: boolean
  onGenerateWorkflow: () => void
  onOpenChat: () => void
  onMobile: () => void
  onExport: () => void
  onExportPrompt: () => void
  onExportProject: () => void
  onEdit: () => void
}) => {
  const { requireExport, isGuest } = useGuest()

  /**
   * Every download goes through the gate, not just the project one.
   *
   * It used to be the Next.js export alone, because the gate demanded an
   * account and the other two were not worth one. The gate now asks a guest
   * for an email, once, so the natural line is "anything you take away" — and
   * a visitor who has already given it is never asked again whichever button
   * they press. Outside /try there is no provider and `requireExport` is a
   * resolved promise, so the dashboard's buttons behave as they always have.
   */
  const gated = (run: () => void) => async () => {
    if (!(await requireExport())) return
    run()
  }

  // A design still being written has a name but nothing to act on yet, so the
  // caption stays and the actions wait. It reads at the row's left because
  // the actions are pushed right, the way a frame's label sits beside its own.
  const caption = shape.label ? (
    <span className="pointer-events-none mr-auto max-w-[12rem] truncate text-xs text-muted-foreground">
      {shape.label}
    </span>
  ) : null

  if (shape.streaming) {
    return caption ? (
      <Controls shape={shape} viewport={viewport}>
        {caption}
      </Controls>
    ) : null
  }

  return (
    <Controls
      shape={shape}
      viewport={viewport}
      below={
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={onEdit}
          title="Open this design in the editor"
          className={cn(pill, 'bg-white/[0.14] text-foreground hover:bg-white/[0.2]')}
        >
          <PenLine className="size-3.5" />
          Edit
        </button>
      }
    >
      {caption}
      <span className="pointer-events-auto">
        <ExploreSwitch designId={shape.id} ready={Boolean(shape.html)} />
      </span>
      <button
        type="button"
        onPointerDown={stopPointer}
        onClick={onGenerateWorkflow}
        disabled={workflowRunning}
        className={pill}
      >
        {workflowRunning ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Building flow…
          </>
        ) : (
          <>
            <Workflow className="size-3.5" />
            Generate Workflow
          </>
        )}
      </button>
      <button type="button" onPointerDown={stopPointer} onClick={onOpenChat} className={pill}>
        <MessageSquare className="size-3.5" />
        Design Chat
      </button>
      <button
        type="button"
        onPointerDown={stopPointer}
        onClick={onMobile}
        disabled={mobileRunning}
        title="Restructure this design for a phone, as a new design beside it"
        className={pill}
      >
        {mobileRunning ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Building…
          </>
        ) : (
          <>
            <Smartphone className="size-3.5" />
            Mobile version
          </>
        )}
      </button>
      <button
        type="button"
        onPointerDown={stopPointer}
        onClick={() => void gated(onExport)()}
        className={pill}
      >
        <Download className="size-3.5" />
        Export
      </button>
      <button
        type="button"
        onPointerDown={stopPointer}
        onClick={() => void gated(onExportPrompt)()}
        title="Download a build brief: palette, type scale, structure and rules"
        className={pill}
      >
        <FileText className="size-3.5" />
        Prompt
      </button>
      {!isGuest && (
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={() => void gated(onExportProject)()}
          title="Download a Next.js project: tokens, a component per section, Tailwind"
          className={pill}
        >
          <FolderDown className="size-3.5" />
          Project
        </button>
      )}
    </Controls>
  )
}

const CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
}

/**
 * Outline and grips for the selected shape. Sizes are divided by the zoom so
 * the handles stay the same size on screen however far in or out you are.
 */
const SelectionBox = ({
  shape,
  scale,
  onResize,
}: {
  shape: Shape
  scale: number
  onResize: (handle: ResizeHandle, event: React.PointerEvent<Element>) => void
}) => {
  const size = 10 / scale
  const edge = 1 / scale
  const corners: Array<[ResizeHandle, number, number]> = [
    ['nw', shape.x, shape.y],
    ['ne', shape.x + shape.width, shape.y],
    ['se', shape.x + shape.width, shape.y + shape.height],
    ['sw', shape.x, shape.y + shape.height],
  ]

  /**
   * Edge grips, at the midpoint of each side.
   *
   * With corners alone, making a frame taller also made it wider — so getting
   * a long page meant dragging a corner down and then dragging it back. These
   * change one dimension and leave the other exactly where it was.
   */
  const midpoints: Array<[ResizeHandle, number, number]> = [
    ['n', shape.x + shape.width / 2, shape.y],
    ['s', shape.x + shape.width / 2, shape.y + shape.height],
    ['w', shape.x, shape.y + shape.height / 2],
    ['e', shape.x + shape.width, shape.y + shape.height / 2],
  ]

  return (
    <>
      <div
        className="pointer-events-none absolute border-sky-400"
        style={{
          left: shape.x,
          top: shape.y,
          width: shape.width,
          height: shape.height,
          borderWidth: edge,
          borderStyle: 'solid',
        }}
      />
      {[...corners, ...midpoints].map(([handle, cx, cy]) => (
        <div
          key={handle}
          onPointerDown={(event) => onResize(handle, event)}
          className="absolute border-sky-400 bg-white"
          style={{
            left: cx - size / 2,
            top: cy - size / 2,
            width: size,
            height: size,
            borderWidth: edge,
            borderStyle: 'solid',
            cursor: CURSORS[handle],
          }}
        />
      ))}
    </>
  )
}

export const Canvas = () => {
  const {
    attachCanvasRef,
    viewport,
    shapes,
    draft,
    tool,
    selectedId,
    selectedIds,
    screenToWorld,
    selectShape,
    toggleSelected,
    selectAll,
    marquee,
    guides,
    align,
    distribute,
    reorder,
    beginMove,
    beginResize,
    editingId,
    frameDialogOpen,
    closeFrameDialog,
    addFrame,
    beginEdit,
    endEdit,
    setShapeText,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    deleteSelected,
    zoomIn,
    zoomOut,
    zoomToFit,
    nudge,
    duplicate,
    setSelection,
    undo,
    redo,
    setTool,
    zoomToScale,
  } = useInfiniteCanvas()
  const router = useRouter()
  const searchParams = useSearchParams()
  const workspace = useWorkspacePath()
  const { generateDesign, generatingFrameId } = useFrame()
  const { styleGuide } = useStyles()

  /** Hands a generated design to the editor, which is its own full screen. */
  const openEditor = (shape: Shape) => {
    const project = searchParams.get('project')
    // Absolute: a relative push resolved against the current path, which put
    // the editor under /dashboard/canvas/editor rather than the session.
    router.push(`${workspace}/editor?project=${project ?? ''}&design=${shape.id}`)
  }

  /** Frames leave as a PNG of the sketch; designs leave as a standalone page. */
  /**
   * The design as a brief rather than a build.
   *
   * The HTML export hands over a finished artefact; this hands over the
   * instructions — palette, type scale, radii, section order and the rules —
   * so the design can be rebuilt in somebody else's stack rather than pasted
   * into it as inline-styled divs.
   */
  const onExportPrompt = (shape: Shape) => {
    exportDesignPrompt(shape, styleGuide)
    toast.success('Build brief exported', {
      description: 'Hand the .md to a coding agent, or read it yourself.',
    })
  }

  /**
   * The design as a project that runs, rather than a page or a brief.
   *
   * The same reading behind the brief, emitted as files: tokens in
   * `globals.css`, a component per section, the markup as Tailwind.
   */
  const onExportProject = (shape: Shape) => {
    const files = exportDesignProject(shape, styleGuide)
    toast.success('Next.js project exported', {
      description: `${files.length} files. npm install, then npm run dev.`,
    })
  }

  const onExport = (shape: Shape) => {
    if (shape.kind === 'generated-ui') {
      exportDesignHtml(shape, styleGuide)
      toast.success('Design exported')
      return
    }
    void exportFramePng(shape, shapes)
      .then(() => toast.success('Frame exported'))
      .catch(() => toast.error('Could not export that frame'))
  }
  /**
   * Images arrive by drop and by paste, not only through the file picker.
   *
   * A browser will only hand a page the bytes of a local file through one of
   * three gestures — a file input, a drop, or a paste — because a page cannot
   * read a path. The picker was the only one wired up, which made dragging a
   * photo onto a canvas do nothing, and that is the gesture people try first.
   *
   * All three end at the same `place()`, so there is one upload path and one
   * set of rules about size and type.
   */
  const dropAt = useRef<{ x: number; y: number } | null>(null)
  const images = useCanvasImage(
    () =>
      dropAt.current ?? screenToWorld({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
  )
  const store = useAppStore()
  const dispatch = useAppDispatch()

  /**
   * A photo that lands on bare canvas gets a frame of its own.
   *
   * The route to Generate runs through a frame: the instruction bar and the
   * pills belong to one, and a frame draws in whatever touches it. So a
   * photograph of a paper sketch, the thing the hint tells people to bring,
   * used to arrive as a picture with nothing to press and no word about the
   * frame it needed. Placing wraps it now, sized to the picture with a
   * margin, and selects the frame so the next move is on screen at once. An
   * image dropped on a frame is that frame's already and is left alone.
   *
   * The wrap happens here, after `place()` resolves, rather than in the
   * placing hook: the ids are read back from the store because the hook
   * announces nothing about what it added.
   */
  const placeImages = async (files: FileList | null) => {
    const before = new Set(selectors.selectIds(store.getState().shapes.entities))
    await images.place(files)
    for (const shape of selectors.selectAll(store.getState().shapes.entities)) {
      if (shape.kind !== 'image' || before.has(shape.id)) continue
      dispatch(wrapImageInFrame({ id: shape.id, frameId: nanoid(), margin: IMAGE_FRAME_MARGIN }))
    }
    dropAt.current = null
  }
  const [overFiles, setOverFiles] = useState(false)

  /** A drag carrying files, as opposed to a shape being dragged on the canvas. */
  const hasFiles = (event: React.DragEvent) =>
    Array.from(event.dataTransfer.types).includes('Files')

  /**
   * Paste is a window listener because the canvas is not focusable, so the
   * event never reaches it. Typing into a field keeps its own paste.
   */
  const pasteRef = useRef<(event: ClipboardEvent) => void>(() => {})
  pasteRef.current = (event: ClipboardEvent) => {
    const files = event.clipboardData?.files
    if (!files?.length) return
    const target = event.target
    if (
      target instanceof HTMLElement &&
      (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)
    ) {
      return
    }
    // Pasted images have no drop point, so they land in the middle of the view.
    dropAt.current = null
    void placeImages(files)
  }

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => pasteRef.current(event)
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const { generateWorkflow, workflowRunningFor } = useWorkflow()
  const { generateMobile, mobileRunningFor } = useMobileVersion()
  const [inspirationOpen, setInspirationOpen] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const { toggle: toggleDesignChat } = useDesignChat()

  /**
   * Keyboard shortcuts.
   *
   * Tool letters follow Figma's, because that is the muscle memory the people
   * this is aimed at already have. Undo is the reflex the app most obviously
   * ignored: it had exactly one binding before this, and it was Delete.
   */
  /** What was last copied. Ids, not shapes — the shapes are in the store. */
  const clipboard = useRef<string[]>([])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const inField =
        target instanceof HTMLElement &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)
      if (inField) return

      const mod = event.metaKey || event.ctrlKey

      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (mod && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        selectAll()
        return
      }
      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicate()
        return
      }
      /**
       * Copy and paste are the same operation as duplicate, split in two.
       *
       * Nothing goes near the system clipboard: the payload is a set of shapes,
       * the clipboard holds text, and round-tripping through it would mean
       * serialising and re-parsing a design for no gain. Copy remembers the
       * selection, paste duplicates it — so pasting after moving away still
       * puts the copy beside the original, which is the behaviour a canvas
       * wants and a text editor does not.
       */
      if (mod && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        clipboard.current = selectedIds
        return
      }
      if (mod && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        if (clipboard.current.length > 0) {
          setSelection(clipboard.current)
          duplicate()
        }
        return
      }
      if (mod) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteSelected()
        return
      }

      // Shift+1 is zoom-to-fit; on most layouts that key reports as '!'.
      if (event.shiftKey && (event.key === '1' || event.key === '!')) {
        event.preventDefault()
        zoomToFit()
        return
      }

      const NUDGE: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }
      const step = NUDGE[event.key]
      if (step) {
        event.preventDefault()
        // Shift makes it a coarse nudge, as everywhere else.
        const size = event.shiftKey ? 10 : 1
        nudge(step[0] * size, step[1] * size)
        return
      }

      const TOOLS: Record<string, Tool> = {
        v: 'select',
        h: 'hand',
        f: 'frame',
        r: 'rectangle',
        o: 'ellipse',
        p: 'pencil',
        l: 'line',
        a: 'arrow',
        t: 'text',
        e: 'eraser',
      }
      const next = TOOLS[event.key.toLowerCase()]
      if (next) {
        event.preventDefault()
        setTool(next)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSelected, duplicate, nudge, redo, selectAll, setSelection, selectedIds, setTool, undo, zoomToFit])

  // The dot grid is painted in screen space and offset by the translate, so it
  // scrolls with the content without needing a huge tiled element.
  const gridSize = 24 * viewport.scale
  const hasFrame = shapes.some((shape) => shape.kind === 'frame')
  const selectedShape = shapes.find((shape) => shape.id === selectedId)
  const chosen = shapes.filter((shape) => selectedIds.includes(shape.id))
  const selectionBounds =
    chosen.length > 1
      ? (() => {
          const minX = Math.min(...chosen.map((shape) => shape.x))
          const minY = Math.min(...chosen.map((shape) => shape.y))
          return {
            x: minX,
            y: minY,
            width: Math.max(...chosen.map((shape) => shape.x + shape.width)) - minX,
            height: Math.max(...chosen.map((shape) => shape.y + shape.height)) - minY,
          }
        })()
      : null
  const selectedText = selectedShape?.kind === 'text' ? selectedShape : undefined
  // Generated designs render their own markup, so there is nothing here to
  // restyle; frames and drawn shapes get the shape panel.
  const selectedStyleable =
    selectedShape && selectedShape.kind !== 'text' && selectedShape.kind !== 'generated-ui'
      ? selectedShape
      : undefined

  // Every family in play, so a shape keeps its face after a reload rather than
  // only once its inspector has been opened.
  useCanvasFonts(
    shapes.flatMap((shape) => (shape.kind === 'text' ? [textStyleOf(shape).fontFamily] : [])),
  )

  /**
   * A click is not a drag. Moves stay away from the gesture handlers until
   * the pointer has left the press by more than the slop, so selecting a
   * shape neither moves it nor writes it; see `click-slop.ts`. Recorded in
   * the capture phase because a shape stops its pointerdown from bubbling,
   * and every gesture computes from its own origin, so the moves withheld
   * here are never missed.
   */
  const press = useRef<Press | null>(null)
  const onPressCapture = (event: React.PointerEvent<HTMLDivElement>) => {
    press.current = pressAt(event.clientX, event.clientY)
  }
  const onMoveUnlessClick = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = press.current
    if (start && !isDrag(start, event.clientX, event.clientY)) return
    onPointerMove(event)
  }
  const onRelease = () => {
    press.current = null
    onPointerUp()
  }

  return (
    <>
      <div
        ref={attachCanvasRef}
        onPointerDownCapture={onPressCapture}
        onPointerDown={onPointerDown}
        onPointerMove={onMoveUnlessClick}
        onPointerUp={onRelease}
        onPointerCancel={onRelease}
        onDragOver={(event) => {
          if (!hasFiles(event)) return
          // Without preventDefault the browser navigates to the dropped file.
          event.preventDefault()
          setOverFiles(true)
        }}
        onDragLeave={(event) => {
          if (event.target === event.currentTarget) setOverFiles(false)
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          setOverFiles(false)
          const rect = event.currentTarget.getBoundingClientRect()
          dropAt.current = screenToWorld({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          })
          void placeImages(event.dataTransfer.files)
        }}
        className={cn(
          // h-full cannot resolve a percentage against a flex-1 parent with no
          // definite height, which collapses the canvas to zero. Absolute fill
          // sidesteps percentage resolution entirely.
          'absolute inset-0 overflow-hidden touch-none select-none',
          tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair',
          tool === 'select' && 'cursor-default',
        )}
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(255 255 255 / 0.12) 1px, transparent 1px)',
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${viewport.translate.x}px ${viewport.translate.y}px`,
        }}
      >
        {overFiles && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-sky-500/5 ring-2 ring-sky-400/60 ring-inset"
          >
            <span className="rounded-full bg-sky-500 px-3 py-1 text-xs font-medium text-white shadow-lg">
              Drop to add
            </span>
          </div>
        )}

        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            transform: `translate(${viewport.translate.x}px, ${viewport.translate.y}px) scale(${viewport.scale})`,
          }}
        >
          {shapes.map((shape) => (
            <ShapeView
              key={shape.id}
              shape={shape}
              selected={selectedIds.includes(shape.id)}
              editing={editingId === shape.id}
              onBeginEdit={() => beginEdit(shape.id)}
              onEndEdit={endEdit}
              onTextChange={(value, height) => setShapeText(shape.id, value, height)}
              onGrab={(event) => beginMove(shape, event)}
            />
          ))}
          {draft && <ShapeView shape={draft} />}

          {/* Grips only make sense on a single shape; a plural selection gets
              one outline around the lot. */}
          {selectedShape && tool === 'select' && (
            <SelectionBox
              shape={selectedShape}
              scale={viewport.scale}
              onResize={(handle, event) => beginResize(selectedShape, handle, event)}
            />
          )}

          {tool === 'select' && selectedIds.length > 1 && selectionBounds && (
            <div
              className="pointer-events-none absolute border border-sky-400/70"
              style={{
                left: selectionBounds.x,
                top: selectionBounds.y,
                width: selectionBounds.width,
                height: selectionBounds.height,
                borderWidth: 1 / viewport.scale,
              }}
            />
          )}

          {/* Snap guides. Drawn far past the viewport in world units so they
              read as infinite rules rather than short ticks. */}
          {guides.map((guide) => (
            <div
              key={`${guide.axis}-${guide.at}`}
              className="pointer-events-none absolute bg-fuchsia-400"
              style={
                guide.axis === 'x'
                  ? {
                      left: guide.at,
                      top: -100000,
                      width: 1 / viewport.scale,
                      height: 200000,
                    }
                  : {
                      top: guide.at,
                      left: -100000,
                      height: 1 / viewport.scale,
                      width: 200000,
                    }
              }
            />
          ))}

          {marquee && (
            <div
              className="pointer-events-none absolute border border-sky-400 bg-sky-400/10"
              style={{
                left: Math.min(marquee.origin.x, marquee.current.x),
                top: Math.min(marquee.origin.y, marquee.current.y),
                width: Math.abs(marquee.current.x - marquee.origin.x),
                height: Math.abs(marquee.current.y - marquee.origin.y),
                borderWidth: 1 / viewport.scale,
              }}
            />
          )}
        </div>

        {/* Labels and action pills, drawn at screen size. See `Controls`. A
            layer above the world one, and beneath the drop overlay. */}
        <div className="pointer-events-none absolute inset-0 z-20">
          {shapes.map((shape) => {
            if (shape.kind === 'frame') {
              return (
                <FrameControls
                  key={shape.id}
                  shape={shape}
                  viewport={viewport}
                  selected={selectedIds.includes(shape.id)}
                  generating={generatingFrameId === shape.id}
                  onGrab={(event) => beginMove(shape, event)}
                  onGenerate={() => void generateDesign(shape)}
                  onInspiration={() => setInspirationOpen((open) => !open)}
                  onExport={() => onExport(shape)}
                />
              )
            }
            if (shape.kind === 'generated-ui') {
              return (
                <DesignControls
                  key={shape.id}
                  shape={shape}
                  viewport={viewport}
                  workflowRunning={workflowRunningFor !== null}
                  mobileRunning={mobileRunningFor !== null}
                  onGenerateWorkflow={() => void generateWorkflow(shape)}
                  onOpenChat={() => toggleDesignChat(shape.id)}
                  onMobile={() => void generateMobile(shape)}
                  onExport={() => onExport(shape)}
                  onExportPrompt={() => onExportPrompt(shape)}
                  onExportProject={() => onExportProject(shape)}
                  onEdit={() => openEditor(shape)}
                />
              )
            }
            return null
          })}
        </div>
      </div>

      {layersOpen ? (
        <LayersPanel
          shapes={shapes}
          selectedIds={selectedIds}
          onSelect={selectShape}
          onToggle={toggleSelected}
          onClose={() => setLayersOpen(false)}
        />
      ) : (
        <button
          type="button"
          aria-label="Layers"
          title="Layers"
          onClick={() => setLayersOpen(true)}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-[11px] text-muted-foreground shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)] ring-1 ring-white/[0.06] backdrop-blur transition-colors hover:text-foreground"
        >
          <LayersIcon className="size-3.5" />
          Layers
        </button>
      )}

      {selectedIds.length > 0 && tool === 'select' && (
        <ArrangeBar
          count={selectedIds.length}
          align={align}
          distribute={distribute}
          reorder={reorder}
        />
      )}

      {selectedText && <Inspector shape={selectedText} />}
      {selectedStyleable && tool === 'select' && <ShapeInspector shape={selectedStyleable} />}

      <FramePresetDialog
        isOpen={frameDialogOpen}
        onClose={closeFrameDialog}
        onPick={addFrame}
      />

      {/* First-run hint. The canvas is where the product happens and it used
          to open as an empty dotted field with no indication of the move.
          The toolbar is named before the keys: it opened with "press F", which
          on a first visit is a shortcut to something not yet found. Every
          name here is checked against its control in hint.test.ts.

          It stays until there is a frame, not until there is a shape. It went
          at the first shape, so a rectangle drawn to see what the tool did
          took the instructions with it while the one step that leads anywhere
          was still undone; and a photo placed on bare canvas is a frame now,
          so the paper route below ends where the drawn one does. */}
      {!hasFrame && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="max-w-sm text-center">
            <p className="text-sm font-medium">Draw a frame, then press Generate.</p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Frame, Rectangle and Text are in the toolbar below, or press <Key>F</Key>,{' '}
              <Key>R</Key> and <Key>T</Key>. Text inside a box says what it is, and{' '}
              <Key>New frame</Key> above picks a device size for you.
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Sketched on paper? Photograph it and drop or paste the photo here. It gets a
              frame of its own.
            </p>
            <ExploreNotice />
          </div>
        </div>
      )}

      <InspirationSidebar isOpen={inspirationOpen} onClose={() => setInspirationOpen(false)} />

      <DesignChat />

      <div className="pointer-events-none absolute top-4 right-5 z-50">
        <AutoSave />
      </div>

      <ToolBar
        zoom={{ scale: viewport.scale, zoomIn, zoomOut, zoomToScale }}
        images={{ ...images, place: placeImages }}
      />
    </>
  )
}

export default Canvas
