'use client'

import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { PhoneScreen } from '@/components/try/phone-screen'
import { usePhone } from '@/components/try/use-phone'

/**
 * The editor's answer to a phone, which is the same as the canvas's.
 *
 * /try decided a phone gets a screen saying so rather than a canvas a finger
 * cannot draw on, and /try/editor decided nothing: it rendered the full
 * editor, with a layer strip across the top and a property sheet across the
 * bottom, on a screen where neither could be used. A link to an editor shared
 * to a phone opened that. The same hook and the same screen, so the two routes
 * cannot disagree about what a phone is.
 *
 * The first render says nothing, as on /try, and shows a spinner rather than
 * the editor: an editor that mounted meanwhile would have started painting a
 * design a phone was about to be told it cannot edit.
 */
export const EditorPhoneGate = ({ children }: { children: ReactNode }) => {
  const phone = usePhone()
  if (phone === undefined) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  }
  if (phone) return <PhoneScreen />
  return <>{children}</>
}
