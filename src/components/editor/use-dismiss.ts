'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Closes a popover when the pointer goes down anywhere outside it.
 *
 * The History and Share popovers used to close through a full-screen catcher:
 * a `fixed inset-0` div behind the panel that took the click. It took the
 * whole click, which is the problem. With a popover open, the first press on
 * Preview or Ask AI closed the popover and did nothing else, and the button
 * only worked the second time, with nothing on screen to say why. Listening on
 * the document for `pointerdown` instead closes the popover before the click
 * exists, and the click then lands on whatever it was aimed at.
 *
 * Escape closes it too, and stops there: the editor's own Escape clears the
 * selection, and closing a popover should not also do that.
 */
export const useDismiss = (
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
) => {
  // Through a ref, so the listener is attached once per opening rather than
  // once per render of the component that opened it.
  const dismiss = useRef(onDismiss)
  useEffect(() => {
    dismiss.current = onDismiss
  })

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: Event) => {
      if (ref.current?.contains(event.target as Node)) return
      dismiss.current()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      dismiss.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, ref])
}
