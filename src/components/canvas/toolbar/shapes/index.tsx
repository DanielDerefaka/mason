'use client'

import {
  ArrowRight,
  Circle,
  Eraser,
  Frame,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Type,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Tool } from '@/redux/slice/shapes'
import { cn } from '@/lib/utils'

export const TOOLS: { value: Tool; label: string; Icon: typeof Square }[] = [
  { value: 'select', label: 'Select', Icon: MousePointer2 },
  { value: 'frame', label: 'Frame', Icon: Frame },
  { value: 'rectangle', label: 'Rectangle', Icon: Square },
  { value: 'ellipse', label: 'Circle', Icon: Circle },
  { value: 'pencil', label: 'Pencil', Icon: Pencil },
  { value: 'arrow', label: 'Arrow', Icon: ArrowRight },
  { value: 'line', label: 'Line', Icon: Minus },
  { value: 'text', label: 'Text', Icon: Type },
  { value: 'eraser', label: 'Eraser', Icon: Eraser },
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
        aria-pressed={tool === value}
        title={label}
        onClick={() => selectTool(value)}
        className={cn(
          'size-9 rounded-full transition-all',
          tool === value
            ? 'bg-[#3a3a3d] text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.14),0_2px_4px_rgb(0_0_0/0.45)] hover:bg-[#3a3a3d] hover:text-white'
            : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground',
        )}
      >
        <Icon className="size-4" />
      </Button>
    ))}
  </>
)

export default ToolBarShapes
