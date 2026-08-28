import type { Metadata } from 'next'
import { Suspense } from 'react'

import { DesignPreview } from '@/components/editor/preview'
import { TryGuestGate } from '@/components/try/guest-gate'

export const metadata: Metadata = { title: 'Preview | Mason' }

export default function TryPreviewPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 bg-background" />}>
      <TryGuestGate>
        <div className="fixed inset-0 z-50 overflow-auto">
          <DesignPreview />
        </div>
      </TryGuestGate>
    </Suspense>
  )
}
