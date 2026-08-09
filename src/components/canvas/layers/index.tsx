'use client'

import {
  ArrowRight,
  Circle,
  Frame,
  Layers as LayersIcon,
  Minus,
  Pencil,
  Sparkles,
  Square,
  Type,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Shape, ShapeKind } from '@/redux/slice/shapes'

const ICONS: Record<ShapeKind, typeof Square> = {
  frame: Frame,
  rectangle: Square,
  ellipse: Circle,
  pencil: Pencil,
  arrow: ArrowRight,
  line: Minus,
  text: Type,
  'generated-ui': Sparkles,
}

const KIND_LABELS: Record<ShapeKind, string> = {
  frame: 'Frame',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  pencil: 'Path',
  arrow: 'Arrow',
  line: 'Line',
  text: 'Text',
  'generated-ui': 'Design',
}

/**
 * Layers.
 *
 * Paint order is the entity adapter's `ids` array, so this list is that array
 * reversed — front of the canvas at the top of the panel, the way every other
 * tool does it. Reordering happens through the arrange bar, which mutates the
 * same array, so the two cannot disagree.
 *
 * A text shape shows what it says; everything else shows its kind. Naming
 * layers individually needs a `name` field the model does not have, and an
 * empty rename box would be worse than a sensible default.
 */
export const LayersPanel = ({
  shapes,
  selectedIds,
  onSelect,
  onToggle,
  onClose,
}: {
  shapes: Shape[]
  selectedIds: string[]
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onClose: () => void
}) => {
  const ordered = [...shapes].reverse()

  return (
    <aside
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      className="absolute top-4 left-4 z-30 flex max-h-[70vh] w-[210px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#141416]/95 shadow-2xl backdrop-blur"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5">
        <span className="flex items-center gap-2 text-[11px] text-white/70">
          <LayersIcon className="size-3.5" />
          Layers
        </span>
        <button
          type="button"
          aria-label="Close layers"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </header>

      {ordered.length === 0 ? (
        <p className="text-muted-foreground px-3 py-4 text-[11px]">Nothing drawn yet.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {ordered.map((shape) => {
            const Icon = ICONS[shape.kind]
            const selected = selectedIds.includes(shape.id)
            const name =
              shape.kind === 'text'
                ? (shape.label?.trim() || 'Text')
                : (shape.label?.trim() || KIND_LABELS[shape.kind])

            return (
              <button
                key={shape.id}
                type="button"
                onClick={(event) =>
                  event.shiftKey ? onToggle(shape.id) : onSelect(shape.id)
                }
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors',
                  selected
                    ? 'bg-white/[0.12] text-white'
                    : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground',
                )}
              >
                <Icon className="size-3.5 shrink-0 opacity-70" />
                <span className="truncate">{name}</span>
              </button>
            )
          })}
        </div>
      )}
    </aside>
  )
}

export default LayersPanel
