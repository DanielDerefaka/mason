import type { Metadata } from 'next'
import { Suspense } from 'react'

import { DesignPreview } from '@/components/editor/preview'
import { TryGuestGate } from '@/components/try/guest-gate'

export const metadata: Metadata = {
  title: 'Preview',
  robots: { index: false, follow: false },
}

/**
 * `admit={false}` for the same reason as the editor beside it: this route
 * previews a project named in its own URL, so it is useful only to the browser
 * holding that session. A browser without one owns nothing to preview, and
 * signing it in as a fresh guest spent a slot of the network's daily
 * allowance — sometimes the last one — to show it an empty page.
 */
export default function TryPreviewPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 bg-background" />}>
      <TryGuestGate admit={false}>
        <div className="fixed inset-0 z-50 overflow-auto">
          <DesignPreview />
        </div>
      </TryGuestGate>
    </Suspense>
  )
}
