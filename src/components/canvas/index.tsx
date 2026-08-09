'use client'

import { useEffect, useState } from 'react'
import { useInfiniteCanvas } from '@/hooks/use-canvas'
import type { Shape } from '@/redux/slice/shapes'
import type { ResizeHandle } from '@/hooks/use-canvas'
import { cn } from '@/lib/utils'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useFrame } from '@/hooks/use-frame'
import { useWorkflow } from '@/hooks/use-workflow'
import { GeneratedUI } from './shapes/generated-ui'
import { InspirationSidebar } from './shapes/inspiration-sidebar'
import { DesignChat } from './shapes/design-chat'
import { useDesignChat } from '@/hooks/use-design-chat'
import { AutoSave } from './autosave'
import { ToolBar } from './toolbar'
import { Inspector, ShapeInspector } from './inspector'
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

const ShapeView = ({
  shape,
  selected,
  onGrab,
  onGenerate,
  onInspiration,
  onGenerateWorkflow,
  onOpenChat,
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
    zoomToScale,
  } = useInfiniteCanvas()
  const { generateDesign, generatingFrameId } = useFrame()
  const { generateWorkflow, workflowRunningFor } = useWorkflow()
  const [inspirationOpen, setInspirationOpen] = useState(false)
  const { toggle: toggleDesignChat } = useDesignChat()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const inField =
        event.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(event.target.tagName)
      if (inField) return
      if (event.key === 'Delete' || event.key === 'Backspace') deleteSelected()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSelected])

  // The dot grid is painted in screen space and offset by the translate, so it
  // scrolls with the content without needing a huge tiled element.
  const gridSize = 24 * viewport.scale
  const selectedShape = shapes.find((shape) => shape.id === selectedId)
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
              selected={shape.id === selectedId}
              onGenerate={() => void generateDesign(shape)}
              onInspiration={() => setInspirationOpen((open) => !open)}
              onGenerateWorkflow={() => void generateWorkflow(shape)}
              onOpenChat={() => toggleDesignChat(shape.id)}
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

          {selectedShape && tool === 'select' && (
            <SelectionBox
              shape={selectedShape}
              scale={viewport.scale}
              onResize={(handle, event) => beginResize(selectedShape, handle, event)}
            />
          )}
        </div>
      </div>

      {selectedText && <Inspector shape={selectedText} />}
      {selectedStyleable && tool === 'select' && <ShapeInspector shape={selectedStyleable} />}

      <FramePresetDialog
        isOpen={frameDialogOpen}
        onClose={closeFrameDialog}
        onPick={addFrame}
      />

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
