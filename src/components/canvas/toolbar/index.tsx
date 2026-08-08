'use client'

import { Redo2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInfiniteCanvas } from '@/hooks/use-canvas'
import { ToolBarShapes } from './shapes'
import { ZoomBar } from './zoom'

const track =
  'flex items-center gap-1 rounded-full bg-black/50 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)] ring-1 ring-white/[0.06] backdrop-blur'

/** History bottom-left, tools centred, zoom bottom-right — the final layout. */
export const ToolBar = () => {
  const { tool, setTool, undo, redo, canUndo, canRedo } = useInfiniteCanvas()

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex items-end justify-between p-5">
      <div className={`pointer-events-auto ml-14 ${track}`}>
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

      <div className={`pointer-events-auto ${track}`}>
        <ToolBarShapes tool={tool} selectTool={setTool} />
      </div>

      <div className="pointer-events-auto">
        <ZoomBar />
      </div>
    </div>
  )
}

export default ToolBar
