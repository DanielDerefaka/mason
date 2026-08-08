'use client'

import { useInfiniteCanvas } from '@/hooks/use-canvas'
import { ToolBarShapes } from './shapes'
import { ZoomBar } from './zoom'

/** One floating bar: the shape tools, then the zoom group nested inside it. */
export const ToolBar = () => {
  const { tool, setTool } = useInfiniteCanvas()

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center p-5">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/[0.07] p-1 shadow-2xl backdrop-blur">
        <ToolBarShapes tool={tool} selectTool={setTool} />
        <span className="mx-1 h-6 w-px bg-white/10" />
        <ZoomBar />
      </div>
    </div>
  )
}

export default ToolBar
