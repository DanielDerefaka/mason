'use client'

import { Image as ImageIcon, Loader2, Redo2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInfiniteCanvas } from '@/hooks/use-canvas'
import { useCanvasImage } from '@/hooks/use-canvas-image'
import { ToolBarShapes } from './shapes'
import { ZoomBar, type ZoomControls } from './zoom'

const track =
  'flex items-center gap-1 rounded-full bg-black/50 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)] ring-1 ring-white/[0.06] backdrop-blur'

/**
 * History bottom-left, tools centred, zoom bottom-right.
 *
 * On a phone that single row overflowed and there was no way to scroll it
 * back — the pill is fixed and centred — so Text, Eraser and both zoom
 * buttons were simply unreachable. Below `sm` the tools take their own full
 * width row and scroll; history and zoom share the row beneath.
 */
export const ToolBar = ({ zoom }: { zoom: ZoomControls }) => {
  const { tool, setTool, undo, redo, canUndo, canRedo, viewport } = useInfiniteCanvas()

  /**
   * Placing an image is not a drawing tool — there is nothing to drag out — so
   * it sits with the tools but opens a file picker instead of arming one.
   * It lands in the middle of what is currently on screen rather than at the
   * world origin, which on a panned canvas is usually nowhere near the view.
   */
  const centre = () => ({
    x: (window.innerWidth / 2 - viewport.translate.x) / viewport.scale,
    y: (window.innerHeight / 2 - viewport.translate.y) / viewport.scale,
  })
  const { input, uploading, pick, place } = useCanvasImage(centre)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex flex-wrap items-end justify-between gap-3 p-4 sm:flex-nowrap sm:p-5">
      <div className={`pointer-events-auto order-2 sm:order-1 ${track}`}>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Undo"
          title="Undo"
          disabled={!canUndo}
          onClick={undo}
          className="size-9 rounded-full text-muted-foreground hover:bg-white/[0.06] hover:text-foreground disabled:opacity-30"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Redo"
          title="Redo"
          disabled={!canRedo}
          onClick={redo}
          className="size-9 rounded-full text-muted-foreground hover:bg-white/[0.06] hover:text-foreground disabled:opacity-30"
        >
          <Redo2 className="size-4" />
        </Button>
      </div>

      {/* w-max inside an overflow-x-auto wrapper: the track keeps its natural
          width and the wrapper scrolls, rather than the buttons squashing. */}
      <div className="pointer-events-auto order-1 w-full overflow-x-auto sm:order-2 sm:w-auto">
        <div className={`w-max ${track}`}>
          <ToolBarShapes tool={tool} selectTool={setTool} />

          <span className="mx-0.5 h-5 w-px shrink-0 bg-white/10" aria-hidden />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Place an image"
            title="Place an image"
            disabled={uploading}
            onClick={pick}
            className="size-9 shrink-0 rounded-full text-muted-foreground hover:bg-white/[0.06] hover:text-foreground disabled:opacity-40"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImageIcon className="size-4" />
            )}
          </Button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => void place(event.target.files)}
          />
        </div>
      </div>

      <div className="pointer-events-auto order-3">
        <ZoomBar {...zoom} />
      </div>
    </div>
  )
}

export default ToolBar
