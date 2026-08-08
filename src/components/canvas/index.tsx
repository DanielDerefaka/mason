'use client'

import { useInfiniteCanvas } from '@/hooks/use-canvas'
import type { Shape } from '@/redux/slice/shapes'
import { cn } from '@/lib/utils'
import { ToolBarShapes } from './toolbar'

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
          <span className="text-muted-foreground absolute -top-5 left-0 text-[11px]">
            {shape.label}
          </span>
        )}
        <div
          className={cn(
            'size-full rounded-sm bg-white/[0.02] ring-1',
            selected ? 'ring-white/70' : 'ring-white/25',
          )}
        />
      </div>
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
  } = useInfiniteCanvas()

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
              onSelect={() => tool === 'select' && selectShape(shape.id)}
            />
          ))}
          {draft && <ShapeView shape={draft} />}
        </div>
      </div>

      <ToolBarShapes />
    </>
  )
}

export default Canvas
