'use client'

import { ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tip } from '../tip'

/**
 * Zoom is anchored on the canvas's centre, so it needs the canvas element's
 * size. Calling the canvas hook here would hand back a second ref that is never
 * attached to anything, and every zoom would silently anchor on (0,0) — so the
 * handlers come from whoever owns the real one.
 */
export type ZoomControls = {
  scale: number
  zoomIn: () => void
  zoomOut: () => void
  zoomToScale: (scale: number) => void
}

/**
 * No key caps here: the canvas binds no key to zooming in or out, and a
 * tooltip that names one would be a promise the keyboard does not keep.
 */
export const ZoomBar = ({ scale, zoomIn, zoomOut, zoomToScale }: ZoomControls) => {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-white/[0.05] px-1 py-0.5">
      <Tip label="Zoom out">
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
      </Tip>
      <Tip label="Reset zoom to 100%">
        <button
          type="button"
          onClick={() => zoomToScale(1)}
          aria-label="Reset zoom to 100%"
          className="text-muted-foreground hover:text-foreground min-w-12 px-1 text-center text-xs tabular-nums transition-colors"
        >
          {Math.round(scale * 100)}%
        </button>
      </Tip>
      <Tip label="Zoom in">
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
      </Tip>
    </div>
  )
}

export default ZoomBar
