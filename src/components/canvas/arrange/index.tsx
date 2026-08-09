'use client'

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  BringToFront,
  ChevronDown,
  ChevronUp,
  SendToBack,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type Align = 'left' | 'centre-x' | 'right' | 'top' | 'centre-y' | 'bottom'
type Reorder = 'front' | 'back' | 'forward' | 'backward'

/**
 * Arrange bar.
 *
 * Sits above the canvas whenever something is selected. Z-order applies to a
 * single shape as happily as to twenty, so it is always live; align needs two
 * shapes to have a meaning and distribute needs three, and both are disabled
 * rather than hidden so the controls do not jump around as a selection grows.
 */
export const ArrangeBar = ({
  count,
  align,
  distribute,
  reorder,
}: {
  count: number
  align: (edge: Align) => void
  distribute: (axis: 'x' | 'y') => void
  reorder: (where: Reorder) => void
}) => {
  const canAlign = count >= 2
  const canDistribute = count >= 3

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-black/60 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)] ring-1 ring-white/[0.06] backdrop-blur">
        <span className="shrink-0 px-2.5 text-[11px] whitespace-nowrap text-muted-foreground">
          {count} selected
        </span>

        <Divider />

        <Item label="Align left" onClick={() => align('left')} disabled={!canAlign}>
          <AlignStartVertical className="size-4" />
        </Item>
        <Item label="Align centre" onClick={() => align('centre-x')} disabled={!canAlign}>
          <AlignCenterVertical className="size-4" />
        </Item>
        <Item label="Align right" onClick={() => align('right')} disabled={!canAlign}>
          <AlignEndVertical className="size-4" />
        </Item>
        <Item label="Align top" onClick={() => align('top')} disabled={!canAlign}>
          <AlignStartHorizontal className="size-4" />
        </Item>
        <Item label="Align middle" onClick={() => align('centre-y')} disabled={!canAlign}>
          <AlignCenterHorizontal className="size-4" />
        </Item>
        <Item label="Align bottom" onClick={() => align('bottom')} disabled={!canAlign}>
          <AlignEndHorizontal className="size-4" />
        </Item>

        <Divider />

        <Item
          label="Distribute horizontally"
          onClick={() => distribute('x')}
          disabled={!canDistribute}
        >
          <AlignHorizontalSpaceAround className="size-4" />
        </Item>
        <Item
          label="Distribute vertically"
          onClick={() => distribute('y')}
          disabled={!canDistribute}
        >
          <AlignVerticalSpaceAround className="size-4" />
        </Item>

        <Divider />

        <Item label="Bring to front" onClick={() => reorder('front')}>
          <BringToFront className="size-4" />
        </Item>
        <Item label="Bring forward" onClick={() => reorder('forward')}>
          <ChevronUp className="size-4" />
        </Item>
        <Item label="Send backward" onClick={() => reorder('backward')}>
          <ChevronDown className="size-4" />
        </Item>
        <Item label="Send to back" onClick={() => reorder('back')}>
          <SendToBack className="size-4" />
        </Item>
      </div>
    </div>
  )
}

const Divider = () => <span className="mx-0.5 h-5 w-px shrink-0 bg-white/10" />

const Item = ({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    // The canvas reads a pointerdown on itself as "deselect", which would
    // empty the selection before the click could act on it.
    onPointerDown={(event) => event.stopPropagation()}
    onClick={onClick}
    className={cn(
      'grid size-8 shrink-0 place-items-center rounded-full transition-colors',
      disabled
        ? 'text-muted-foreground/30'
        : 'text-muted-foreground hover:bg-white/[0.08] hover:text-foreground',
    )}
  >
    {children}
  </button>
)

export default ArrangeBar
