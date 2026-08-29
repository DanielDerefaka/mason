import type { Metadata } from 'next'
import { Suspense } from 'react'

import { DesignEditor } from '@/components/editor'
import { TryGuestGate } from '@/components/try/guest-gate'

export const metadata: Metadata = { title: 'Editor | Mason' }

/**
 * The same full-screen editor the dashboard uses, behind the guest gate so
 * a fresh tab still gets a session, and inside GuestProvider so an export
 * can ask a guest for their address first.
 */
export default function TryEditorPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 bg-background" />}>
      <TryGuestGate>
        <div className="fixed inset-0 z-50 overflow-hidden">
          <DesignEditor />
        </div>
      </TryGuestGate>
    </Suspense>
  )
}
