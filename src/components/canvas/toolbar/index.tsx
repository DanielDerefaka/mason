'use client'

import { Circle, Frame, Hand, MousePointer2, Square, Type } from 'lucide-react'
import { useInfiniteCanvas } from '@/hooks/use-canvas'
import type { Tool } from '@/redux/slice/shapes'
import { cn } from '@/lib/utils'
import { ZoomBar } from './zoom'

const TOOLS: { value: Tool; label: string; Icon: typeof Square }[] = [
  { value: 'select', label: 'Select', Icon: MousePointer2 },
  { value: 'hand', label: 'Pan', Icon: Hand },
  { value: 'frame', label: 'Frame', Icon: Frame },
  { value: 'rectangle', label: 'Rectangle', Icon: Square },
  { value: 'ellipse', label: 'Ellipse', Icon: Circle },
  { value: 'text', label: 'Text', Icon: Type },
]

export const ToolBarShapes = () => {
  const { tool, setTool } = useInfiniteCanvas()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 items-end p-5">
      <div />
      <div className="pointer-events-auto flex justify-center">
        <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1 backdrop-blur">
          {TOOLS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              title={label}
              onClick={() => setTool(value)}
              className={cn(
                'grid size-9 place-items-center rounded-full transition-colors',
                tool === value
                  ? 'bg-white text-black'
                  : 'text-muted-foreground hover:bg-white/10 hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>
      <div className="pointer-events-auto flex justify-end">
        <ZoomBar />
      </div>
    </div>
  )
}

export default ToolBarShapes
