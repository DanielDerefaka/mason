'use client'

import { Minus, Plus } from 'lucide-react'
import { useInfiniteCanvas } from '@/hooks/use-canvas'

export const ZoomBar = () => {
  const { viewport, zoomIn, zoomOut, zoomToScale } = useInfiniteCanvas()

  return (
    <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1 backdrop-blur">
      <button
        type="button"
        aria-label="Zoom out"
        onClick={zoomOut}
        className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
      >
        <Minus className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => zoomToScale(1)}
        title="Reset zoom"
        className="min-w-14 rounded-full px-2 py-1 text-center text-xs tabular-nums text-muted-foreground transition-colors hover:text-foreground"
      >
        {Math.round(viewport.scale * 100)}%
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={zoomIn}
        className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

export default ZoomBar
