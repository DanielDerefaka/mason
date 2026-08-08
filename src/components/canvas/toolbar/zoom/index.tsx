'use client'

import { ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInfiniteCanvas } from '@/hooks/use-canvas'

export const ZoomBar = () => {
  const { viewport, zoomIn, zoomOut, zoomToScale } = useInfiniteCanvas()

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-white/[0.05] px-1 py-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Zoom out"
        onClick={zoomOut}
        className="size-8 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        <ZoomOut className="size-4" />
      </Button>
      <button
        type="button"
        onClick={() => zoomToScale(1)}
        title="Reset zoom"
        className="text-muted-foreground hover:text-foreground min-w-12 px-1 text-center text-xs tabular-nums transition-colors"
      >
        {Math.round(viewport.scale * 100)}%
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Zoom in"
        onClick={zoomIn}
        className="size-8 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
      >
        <ZoomIn className="size-4" />
      </Button>
    </div>
  )
}

export default ZoomBar
