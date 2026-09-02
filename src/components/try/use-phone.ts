'use client'

import { useEffect, useState } from 'react'

/**
 * A screen the canvas cannot be drawn on: narrower than 768px, or driven by a
 * finger. Each half matters on its own. A phone held sideways is 844px wide
 * and still has nothing finer than a thumb to draw with, and the canvas is
 * `touch-none`; a desktop window snapped narrow still has a mouse, but the
 * toolbar wraps and no frame preset fits, and the advice it gets, a bigger
 * screen, still holds. The breakpoint is the one `useIsMobile` uses, so the
 * two agree about where a phone ends.
 */
export const PHONE_QUERY = '(max-width: 767px), (pointer: coarse)'

/**
 * Whether this is a phone, or nothing yet.
 *
 * `undefined` on the server and on the first client render, and that third
 * value is the point. The server cannot see a viewport, and the shell that
 * asks must not mount the guest gate until it knows: the gate opens a session
 * in its first effect, and a child's effects run before its parent's, so a
 * gate mounted "meanwhile" and swapped out once the width arrived would
 * already have spent one of the network's daily sessions on a page nobody
 * could use. `useIsMobile` answers `false` while it is still finding out,
 * which is exactly the wrong default here, hence a hook of its own.
 *
 * Read once, on mount, and not again. The decision is about the device the
 * visitor arrived on, not the window: a desktop narrowed mid-sketch keeps its
 * canvas rather than losing the selection to a screen telling it to find a
 * bigger one.
 */
export const usePhone = (): boolean | undefined => {
  const [phone, setPhone] = useState<boolean | undefined>(undefined)
  useEffect(() => {
    // No matchMedia at all is a browser too old to draw in anyway; it gets
    // the canvas, which is what it got before.
    setPhone(window.matchMedia?.(PHONE_QUERY).matches ?? false)
  }, [])
  return phone
}
