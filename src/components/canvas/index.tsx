'use client'

import { useEffect, useState } from 'react'
import { useInfiniteCanvas } from '@/hooks/use-canvas'
import type { Shape, Tool } from '@/redux/slice/shapes'
import type { ResizeHandle } from '@/hooks/use-canvas'
import { cn } from '@/lib/utils'
import { Download, Layers as LayersIcon, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useFrame } from '@/hooks/use-frame'
import { useWorkflow } from '@/hooks/use-workflow'
import { GeneratedUI } from './shapes/generated-ui'
import { InspirationSidebar } from './shapes/inspiration-sidebar'
import { DesignChat } from './shapes/design-chat'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDesignChat } from '@/hooks/use-design-chat'
import { useStyles } from '@/hooks/use-styles'
import { exportDesignHtml, exportFramePng } from '@/lib/export'
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
  onEdit,
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
  onEdit?: () => void
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
        onEdit={onEdit}
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
        {shape.label && (
          <span className="text-muted-foreground absolute -top-6 left-0 text-[11px]">
            {shape.label}
          </span>
        )}
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
          className={cn(
            'size-full rounded-sm bg-white/[0.02] ring-1',
            selected ? 'ring-white/70' : 'ring-white/25',
          )}
        />
      </div>
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

const CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
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
      {corners.map(([handle, cx, cy]) => (
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
    undo,
    redo,
    setTool,
    zoomToScale,
  } = useInfiniteCanvas()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { generateDesign, generatingFrameId } = useFrame()
  const { styleGuide } = useStyles()

  /** Hands a generated design to the editor, which is its own full screen. */
  const openEditor = (shape: Shape) => {
    const project = searchParams.get('project')
    router.push(`editor?project=${project ?? ''}&design=${shape.id}`)
  }

  /** Frames leave as a PNG of the sketch; designs leave as a standalone page. */
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
  }, [deleteSelected, duplicate, nudge, redo, selectAll, setTool, undo, zoomToFit])

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
              onEdit={() => openEditor(shape)}
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
