'use client'

import { useEffect, useState } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * The name of a toolbar control, and the key that reaches it.
 *
 * The buttons carried a native `title`, which is the aria-label again after
 * a second's hover and never the shortcut. The hint on an empty canvas says
 * "press F", and the letters were written nowhere near the buttons they
 * stand in for, so the only way to learn the rest was to guess. The key sits
 * beside the name here, as a key cap, and the tooltip is the app's own rather
 * than the browser's, so it comes up at once and reads in the app's type.
 */
export const Tip = ({
  label,
  shortcut,
  children,
}: {
  label: string
  shortcut?: string
  children: React.ReactNode
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="top" sideOffset={8} className="flex items-center gap-2">
      {label}
      {shortcut && (
        <kbd className="rounded bg-background/15 px-1 font-sans text-[10px] tracking-wide text-background/80">
          {shortcut}
        </kbd>
      )}
    </TooltipContent>
  </Tooltip>
)

/**
 * The modifier the platform uses for undo, as its key cap.
 *
 * Read after mount rather than during render, so the server and the first
 * client render agree: the server has no navigator and would say Ctrl to a
 * Mac, and React would then complain about the mismatch.
 */
export const useModifierKey = () => {
  const [mod, setMod] = useState('Ctrl')
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setMod('⌘')
  }, [])
  return mod
}

/** The undo and redo chords, spelt the way the platform spells them. */
export const historyKeys = (mod: string) =>
  mod === '⌘' ? { undo: '⌘Z', redo: '⇧⌘Z' } : { undo: 'Ctrl+Z', redo: 'Ctrl+Shift+Z' }
