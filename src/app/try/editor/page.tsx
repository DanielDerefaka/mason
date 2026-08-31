import type { Metadata } from 'next'
import { Suspense } from 'react'

import { DesignEditor } from '@/components/editor'
import { TryGuestGate } from '@/components/try/guest-gate'

export const metadata: Metadata = {
  title: 'Editor',
  robots: { index: false, follow: false },
}

/**
 * The same full-screen editor the dashboard uses, inside GuestProvider so an
 * export can ask a guest for their address first.
 *
 * `admit={false}`: a fresh *tab* already carries the session cookie, so it
 * needs no admission. A fresh *browser* does not, and it owns no project
 * either — this route names one in its URL. Minting a session for it spent a
 * slot of the network's daily allowance and rendered an empty editor.
 */
export default function TryEditorPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 bg-background" />}>
      <TryGuestGate admit={false}>
        <div className="fixed inset-0 z-50 overflow-hidden">
          <DesignEditor />
        </div>
      </TryGuestGate>
    </Suspense>
  )
}
