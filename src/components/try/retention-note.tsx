'use client'

import { useEffect, useState } from 'react'

const SEEN_KEY = 'mason-try-retention-noted'

/**
 * One line, once per tab: how long work made without an account is kept.
 *
 * /faq says fourteen days and `STALE_AFTER_MS` in convex/guest.ts deletes on
 * the fourteenth; nothing on the canvas itself said so, and the canvas is
 * where the work is. copy.test.ts holds the word here to the constant.
 *
 * Session storage rather than local, so it comes back in a new tab but not
 * on every reload of this one. Read inside try/catch and shown when the read
 * fails: a browser with storage off sees the line on every load, which is the
 * harmless direction to be wrong in.
 */
export const RetentionNote = () => {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) return
      window.sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Storage off or full; fall through and say it anyway.
    }
    setShow(true)
  }, [])

  if (!show) return null
  return (
    <p className="mt-1 text-[11px] text-muted-foreground">
      Work made without an account is kept for fourteen days in this browser.
    </p>
  )
}
