'use client'

import { ArrowRight, Circle, Frame, Hand, MousePointer2, Pencil, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Tool } from '@/redux/slice/shapes'
import { cn } from '@/lib/utils'

export const TOOLS: { value: Tool; label: string; Icon: typeof Square }[] = [
  { value: 'select', label: 'Select', Icon: MousePointer2 },
  { value: 'hand', label: 'Pan', Icon: Hand },
  { value: 'frame', label: 'Frame', Icon: Frame },
  { value: 'rectangle', label: 'Rectangle', Icon: Square },
  { value: 'ellipse', label: 'Circle', Icon: Circle },
  { value: 'pencil', label: 'Pencil', Icon: Pencil },
  { value: 'arrow', label: 'Arrow', Icon: ArrowRight },
]

export const ToolBarShapes = ({
  tool,
  selectTool,
}: {
  tool: Tool
  selectTool: (tool: Tool) => void
}) => (
  <>
    {TOOLS.map(({ value, label, Icon }) => (
      <Button
        key={value}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        onClick={() => selectTool(value)}
        className={cn(
          'size-9 rounded-full',
          tool === value
            ? 'bg-white text-black hover:bg-white hover:text-black'
            : 'text-muted-foreground hover:bg-white/10 hover:text-foreground',
        )}
      >
        <Icon className="size-4" />
      </Button>
    ))}
  </>
)

export default ToolBarShapes
