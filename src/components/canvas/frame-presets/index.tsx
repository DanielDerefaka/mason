'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DEFAULT_OPEN_GROUP, FRAME_PRESET_GROUPS } from '@/lib/frame-presets'
import type { FramePreset } from '@/lib/frame-presets'
import { cn } from '@/lib/utils'

/**
 * Frame size picker.
 *
 * Opened by New Frame in the navbar. That button is in a different tree from
 * the canvas, so the open flag lives in the store — see `frameDialogOpen`.
 *
 * Everything is passed in rather than pulled from `useInfiniteCanvas` here:
 * the hook keeps the canvas element in a per-instance ref, so a second call
 * gets a null ref, no viewport size, and a frame placed at the origin.
 *
 * Groups collapse rather than paginate: the full list is 13 sizes, which is
 * short enough to scan but long enough that showing all of it buries the
 * desktop sizes most designs here start from.
 */
export const FramePresetDialog = ({
  isOpen,
  onClose,
  onPick,
}: {
  isOpen: boolean
  onClose: () => void
  onPick: (preset: FramePreset) => void
}) => {
  const [open, setOpen] = useState<string[]>([DEFAULT_OPEN_GROUP])

  const toggle = (title: string) =>
    setOpen((current) =>
      current.includes(title) ? current.filter((t) => t !== title) : [...current, title],
    )

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <DialogTitle className="text-base">New frame</DialogTitle>
          <DialogDescription className="text-xs">
            Pick a size, or draw one yourself with the frame tool.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto py-1">
          {FRAME_PRESET_GROUPS.map((group) => {
            const expanded = open.includes(group.title)

            return (
              <section key={group.title}>
                <button
                  type="button"
                  onClick={() => toggle(group.title)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-2 px-5 py-2.5 text-left text-sm font-medium transition-colors hover:bg-white/[0.04]"
                >
                  {expanded ? (
                    <ChevronDown className="size-3.5 shrink-0 opacity-70" />
                  ) : (
                    <ChevronRight className="size-3.5 shrink-0 opacity-70" />
                  )}
                  {group.title}
                </button>

                {expanded &&
                  group.presets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => onPick(preset)}
                      className={cn(
                        'flex w-full items-center justify-between gap-4 py-2.5 pr-5 pl-11 text-left text-sm',
                        'transition-colors hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:outline-none',
                      )}
                    >
                      <span className="truncate">{preset.name}</span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {preset.width} × {preset.height}
                      </span>
                    </button>
                  ))}
              </section>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FramePresetDialog
