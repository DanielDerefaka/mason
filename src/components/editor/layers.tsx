'use client'

import { ChevronDown, ChevronRight, Eye, EyeOff, Lock, LockOpen } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

import type { DropWhere, LayerRow } from './node'

/**
 * The layer tree.
 *
 * A nested list rather than the flat one it replaces, because a generated
 * design is nested and a flat list of a hundred rows capped at five levels
 * deep is a worse map than no map. Everything it shows is read back out of the
 * DOM on every change — there is no tree model to fall out of step with the
 * design.
 *
 * Ids are positional paths, so every reshape here restamps the whole tree and
 * the caller re-derives the selection afterwards.
 */
export const Layers = ({
  rows,
  selectedId,
  onSelect,
  onHover,
  onToggle,
  onHide,
  onLock,
  onRename,
  onDrop,
  allowInside,
}: {
  rows: LayerRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onToggle: (id: string) => void
  onHide: (id: string, hidden: boolean) => void
  onLock: (id: string, locked: boolean) => void
  onRename: (id: string, name: string) => void
  onDrop: (movingId: string, targetId: string, where: DropWhere) => void
  allowInside: (id: string) => boolean
}) => {
  const [dragId, setDragId] = useState<string | null>(null)
  const [hint, setHint] = useState<{ id: string; where: DropWhere } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)

  /**
   * Where in the row the pointer is decides what the drop means: the top and
   * bottom quarters put the layer beside the one it was dropped on, and the
   * middle puts it inside — but only where something can hold it, so the
   * indicator never promises a drop that will be refused.
   */
  const placement = (event: React.DragEvent, id: string): DropWhere => {
    const rect = event.currentTarget.getBoundingClientRect()
    const offset = (event.clientY - rect.top) / rect.height
    if (offset < 0.25) return 'before'
    if (offset > 0.75) return 'after'
    return allowInside(id) ? 'inside' : offset < 0.5 ? 'before' : 'after'
  }

  return (
    <div className="flex flex-col py-1">
      {rows.map((row) => {
        const marker = hint?.id === row.id ? hint.where : null
        const dimmed = row.hidden || row.hiddenAbove

        return (
          <div
            key={row.id}
            draggable={renaming !== row.id}
            onDragStart={(event) => {
              // Firefox refuses to start a drag at all without payload on the
              // transfer, so the row's id is written even though the drop is
              // resolved from state rather than read back out of it.
              event.dataTransfer.setData('text/plain', row.id)
              event.dataTransfer.effectAllowed = 'move'
              setDragId(row.id)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              if (dragId && dragId !== row.id) setHint({ id: row.id, where: placement(event, row.id) })
            }}
            onDragLeave={() => setHint((current) => (current?.id === row.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault()
              const where = placement(event, row.id)
              setHint(null)
              setDragId(null)
              if (dragId && dragId !== row.id) onDrop(dragId, row.id, where)
            }}
            onDragEnd={() => {
              setDragId(null)
              setHint(null)
            }}
            onClick={() => onSelect(row.id)}
            onDoubleClick={() => setRenaming(row.id)}
            onMouseEnter={() => onHover(row.id)}
            onMouseLeave={() => onHover(null)}
            style={{ paddingLeft: 4 + row.depth * 11 }}
            className={cn(
              // shrink-0: sixty rows in a fixed-height column compress into
              // each other rather than overflowing into the scroll without it.
              'group relative flex h-[26px] shrink-0 cursor-grab items-center gap-1 pr-1.5 text-[12px] transition-colors active:cursor-grabbing',
              dragId === row.id && 'opacity-40',
              marker === 'inside' && 'ring-1 ring-fuchsia-400 ring-inset',
              selectedId === row.id
                ? 'bg-white/[0.12] text-white'
                : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
            )}
          >
            {(marker === 'before' || marker === 'after') && (
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-x-0 h-0.5 bg-fuchsia-400',
                  marker === 'before' ? 'top-0' : 'bottom-0',
                )}
              />
            )}

            {row.hasChildren ? (
              <button
                type="button"
                aria-label={row.open ? 'Collapse' : 'Expand'}
                aria-expanded={row.open}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggle(row.id)
                }}
                className="grid size-4 shrink-0 place-items-center rounded text-white/40 hover:text-white"
              >
                {row.open ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
              </button>
            ) : (
              <span className="size-4 shrink-0" />
            )}

            {renaming === row.id ? (
              <input
                autoFocus
                defaultValue={row.label}
                onClick={(event) => event.stopPropagation()}
                onBlur={(event) => {
                  onRename(row.id, event.target.value)
                  setRenaming(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                  // Escape has to leave without writing, so the name is cleared
                  // first and the blur handler has nothing to say.
                  if (event.key === 'Escape') {
                    event.currentTarget.value = row.label
                    setRenaming(null)
                  }
                  event.stopPropagation()
                }}
                className="min-w-0 flex-1 rounded-sm bg-white/10 px-1 text-[12px] text-white outline-none"
              />
            ) : (
              <span
                className={cn('min-w-0 flex-1 truncate text-left', dimmed && 'opacity-40')}
                title={`${row.label} — double-click to rename`}
              >
                {row.label}
              </span>
            )}

            <RowToggle
              label={row.hidden ? 'Show' : 'Hide'}
              // An inherited state is shown but cannot be undone from here:
              // the layer is hidden because something above it is.
              active={row.hidden}
              disabled={row.hiddenAbove && !row.hidden}
              onClick={() => onHide(row.id, !row.hidden)}
            >
              {row.hidden || row.hiddenAbove ? (
                <EyeOff className="size-3" />
              ) : (
                <Eye className="size-3" />
              )}
            </RowToggle>

            <RowToggle
              label={row.locked ? 'Unlock' : 'Lock'}
              active={row.locked}
              disabled={row.lockedAbove && !row.locked}
              onClick={() => onLock(row.id, !row.locked)}
            >
              {row.locked || row.lockedAbove ? (
                <Lock className="size-3" />
              ) : (
                <LockOpen className="size-3" />
              )}
            </RowToggle>
          </div>
        )
      })}
    </div>
  )
}

/** Only shown once it is doing something, or while the row is under the pointer. */
const RowToggle = ({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation()
      onClick()
    }}
    className={cn(
      'grid size-5 shrink-0 place-items-center rounded transition-colors hover:bg-white/10',
      active
        ? 'text-white'
        : 'text-white/45 opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
      disabled && 'opacity-40 group-hover:opacity-40',
    )}
  >
    {children}
  </button>
)
