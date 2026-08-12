'use client'

import { useEffect, useRef, useState } from 'react'
import { useInfiniteCanvas } from '@/hooks/use-canvas'
import type { Shape, Tool } from '@/redux/slice/shapes'
import type { ResizeHandle } from '@/hooks/use-canvas'
import { cn } from '@/lib/utils'
import { Download, Layers as LayersIcon, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useFrame } from '@/hooks/use-frame'
import { useWorkflow } from '@/hooks/use-workflow'
import { useMobileVersion } from '@/hooks/use-mobile-version'
import { useAppDispatch } from '@/redux/hooks'
import { updateShape } from '@/redux/slice/shapes'
import { GeneratedUI } from './shapes/generated-ui'
import { InspirationSidebar } from './shapes/inspiration-sidebar'
import { DesignChat } from './shapes/design-chat'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useDesignChat } from '@/hooks/use-design-chat'
import { useStyles } from '@/hooks/use-styles'
import { exportDesignHtml, exportDesignPrompt, exportFramePng } from '@/lib/export'
import { toast } from 'sonner'
import { AutoSave } from './autosave'
import { ToolBar } from './toolbar'
import { Inspector, ShapeInspector } from './inspector'
import { ArrangeBar } from './arrange'
import { LayersPanel } from './layers'
import { FramePresetDialog } from './frame-presets'
import { useCanvasFonts } from '@/hooks/use-canvas-fonts'
import {
  boxShadowFor,
  cssForTextStyle,
  dropShadowFor,
  shapeStyleOf,
  textStyleOf,
} from '@/lib/text-style'

type PointerHandler = (event: React.PointerEvent<Element>) => void

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
  onGenerate,
  onInspiration,
  onGenerateWorkflow,
  onOpenChat,
  onExport,
  onExportPrompt,
  onEdit,
  onMobile,
  mobileRunning,
  workflowRunning,
  onBeginEdit,
  onEndEdit,
  onTextChange,
  editing,
  generating,
}: {
  shape: Shape
  selected?: boolean
  onGrab?: PointerHandler
  onGenerate?: () => void
  onInspiration?: () => void
  onGenerateWorkflow?: () => void
  onOpenChat?: () => void
  onExport?: () => void
  onExportPrompt?: () => void
  onEdit?: () => void
  onMobile?: () => void
  mobileRunning?: boolean
  workflowRunning?: boolean
  onBeginEdit?: () => void
  onEndEdit?: () => void
  onTextChange?: (value: string, height: number) => void
  editing?: boolean
  generating?: boolean
}) => {
  if (shape.kind === 'generated-ui') {
    return (
      <GeneratedUI
        shape={shape}
        selected={selected}
        onGrab={onGrab}
        onGenerateWorkflow={onGenerateWorkflow}
        onOpenChat={onOpenChat}
        onExport={onExport}
        onExportPrompt={onExportPrompt}
        onEdit={onEdit}
        onMobile={onMobile}
        mobileRunning={mobileRunning}
        workflowRunning={workflowRunning}
      />
    )
  }

  const base = 'absolute'
  const style: React.CSSProperties = {
    left: shape.x,
    top: shape.y,
    width: shape.width,
    height: shape.height,
  }

  if (shape.kind === 'frame') {
    return (
      <div className={base} style={style} onPointerDown={onGrab}>
        <FrameLabel shape={shape} />
        {/* Frame actions sit above the top-right corner, outside the frame. */}
        <div className="absolute -top-7 right-0 flex items-center gap-2">
          <button
            type="button"
            onPointerDown={stopPointer}
            onClick={onInspiration}
            className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.14] hover:text-foreground"
          >
            <Sparkles className="size-3" />
            Inspiration
          </button>
          <button
            type="button"
            onPointerDown={stopPointer}
            onClick={onGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.14] hover:text-foreground disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="size-3" />
                Generate
              </>
            )}
          </button>
          {onExport && (
            <button
              type="button"
              onPointerDown={stopPointer}
              onClick={onExport}
              title="Export this frame as a PNG"
              className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/[0.14] hover:text-foreground"
            >
              <Download className="size-3" />
              Export
            </button>
          )}
        </div>
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
const FrameLabel = ({ shape }: { shape: Shape }) => {
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
        className="absolute -top-6 left-0 w-48 rounded border border-sky-400/60 bg-black/80 px-1 text-[11px] text-white outline-none"
      />
    )
  }

  if (!shape.label) return null

  return (
    <span
      onPointerDown={stopPointer}
      onDoubleClick={() => {
        setDraft(shape.label ?? '')
        setEditing(true)
      }}
      title="Double-click to rename"
      className="text-muted-foreground hover:text-foreground absolute -top-6 left-0 cursor-text text-[11px] transition-colors"
    >
      {shape.label}
    </span>
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
  const { session } = useParams<{ session: string }>()
  const { generateDesign, generatingFrameId } = useFrame()
  const { styleGuide } = useStyles()

  /** Hands a generated design to the editor, which is its own full screen. */
  const openEditor = (shape: Shape) => {
    const project = searchParams.get('project')
    // Absolute: a relative push resolved against the current path, which put
    // the editor under /dashboard/canvas/editor rather than the session.
    router.push(
      `/dashboard/${session}/editor?project=${project ?? ''}&design=${shape.id}`,
    )
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

  return (
    <>
      <div
        ref={attachCanvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
              onGenerate={() => void generateDesign(shape)}
              onInspiration={() => setInspirationOpen((open) => !open)}
              onGenerateWorkflow={() => void generateWorkflow(shape)}
              onOpenChat={() => toggleDesignChat(shape.id)}
              onExport={() => onExport(shape)}
              onExportPrompt={
                shape.kind === 'generated-ui' ? () => onExportPrompt(shape) : undefined
              }
              onEdit={() => openEditor(shape)}
              onMobile={() => void generateMobile(shape)}
              mobileRunning={mobileRunningFor !== null}
              workflowRunning={workflowRunningFor !== null}
              editing={editingId === shape.id}
              onBeginEdit={() => beginEdit(shape.id)}
              onEndEdit={endEdit}
              onTextChange={(value, height) => setShapeText(shape.id, value, height)}
              generating={generatingFrameId === shape.id}
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
          to open as an empty dotted field with no indication of the move. */}
      {shapes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="max-w-sm text-center">
            <p className="text-sm font-medium">Draw a frame, then press Generate.</p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Press <Key>F</Key> for a frame or <Key>R</Key> for a rectangle, and label the
              boxes with <Key>T</Key> — a labelled sketch is an instruction, an unlabelled
              one is a guess. <Key>New Frame</Key> above picks a device size for you.
            </p>
          </div>
        </div>
      )}

      <InspirationSidebar isOpen={inspirationOpen} onClose={() => setInspirationOpen(false)} />

      <DesignChat />

      <div className="pointer-events-none absolute top-4 right-5 z-50">
        <AutoSave />
      </div>

      <ToolBar zoom={{ scale: viewport.scale, zoomIn, zoomOut, zoomToScale }} />
    </>
  )
}

export default Canvas
