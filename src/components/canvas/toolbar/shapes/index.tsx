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
import { Tip } from '../tip'

/**
 * The shortcut beside each tool is the key the canvas binds to it, and
 * `shortcuts.test.ts` reads the canvas's binding table to hold the two
 * together, so a rebinding there fails here before it lies in a tooltip.
 */
export const TOOLS: { value: Tool; label: string; shortcut: string; Icon: typeof Square }[] = [
  { value: 'select', label: 'Select', shortcut: 'V', Icon: MousePointer2 },
  { value: 'frame', label: 'Frame', shortcut: 'F', Icon: Frame },
  { value: 'rectangle', label: 'Rectangle', shortcut: 'R', Icon: Square },
  { value: 'ellipse', label: 'Circle', shortcut: 'O', Icon: Circle },
  { value: 'pencil', label: 'Pencil', shortcut: 'P', Icon: Pencil },
  { value: 'arrow', label: 'Arrow', shortcut: 'A', Icon: ArrowRight },
  { value: 'line', label: 'Line', shortcut: 'L', Icon: Minus },
  { value: 'text', label: 'Text', shortcut: 'T', Icon: Type },
  { value: 'eraser', label: 'Eraser', shortcut: 'E', Icon: Eraser },
]

export const ToolBarShapes = ({
  tool,
  selectTool,
}: {
  tool: Tool
  selectTool: (tool: Tool) => void
}) => (
  <>
    {TOOLS.map(({ value, label, shortcut, Icon }) => (
      <Tip key={value} label={label} shortcut={shortcut}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={tool === value}
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
      </Tip>
    ))}
  </>
)

export default ToolBarShapes
