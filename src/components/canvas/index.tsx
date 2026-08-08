'use client'

import { useEffect } from 'react'
import { useInfiniteCanvas } from '@/hooks/use-canvas'
import type { Shape } from '@/redux/slice/shapes'
import { cn } from '@/lib/utils'
import { Sparkles, Wand2 } from 'lucide-react'
import { ToolBar } from './toolbar'

const ShapeView = ({
  shape,
  selected,
  onSelect,
}: {
  shape: Shape
  selected?: boolean
  onSelect?: () => void
}) => {
  const base = 'absolute'
  const style: React.CSSProperties = {
    left: shape.x,
    top: shape.y,
    width: shape.width,
    height: shape.height,
  }

  if (shape.kind === 'frame') {
    return (
      <div className={base} style={style} onPointerDown={onSelect}>
        {shape.label && (
          <span className="text-muted-foreground absolute -top-6 left-0 text-[11px]">
            {shape.label}
          </span>
        )}
        {/* Frame actions sit above the top-right corner, outside the frame. */}
        <div className="absolute -top-7 right-0 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground">
            <Sparkles className="size-3" />
            Inspiration
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] text-muted-foreground">
            <Wand2 className="size-3" />
            Generate
          </span>
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
        <path
          d={d}
          fill="none"
          stroke={shape.fill}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={shape.kind === 'arrow' ? `url(#arrow-${shape.id})` : undefined}
          opacity={selected ? 1 : 0.9}
        />
      </svg>
    )
  }

  if (shape.kind === 'text') {
    return (
      <div
        className={cn(base, 'grid place-items-center text-sm', selected && 'ring-1 ring-white/70')}
        style={style}
        onPointerDown={onSelect}
      >
        Text
      </div>
    )
  }

  return (
    <div
      className={cn(
        base,
        shape.kind === 'ellipse' ? 'rounded-full' : 'rounded-md',
        selected && 'ring-2 ring-white/80',
      )}
      style={{ ...style, background: shape.fill }}
      onPointerDown={onSelect}
    />
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
    selectShape,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    eraseShape,
    deleteSelected,
  } = useInfiniteCanvas()

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
              onSelect={() => {
                if (tool === 'select') selectShape(shape.id)
                if (tool === 'eraser') eraseShape(shape.id)
              }}
            />
          ))}
          {draft && <ShapeView shape={draft} />}
        </div>
      </div>

      <ToolBar />
    </>
  )
}

export default Canvas
