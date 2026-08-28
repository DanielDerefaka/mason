import { Suspense } from 'react'

import { Canvas } from '@/components/canvas'
import { TryShell } from '@/components/try/shell'

export default function TryPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-background" />}>
      <TryShell>
        <div className="relative flex-1">
          <Canvas />
        </div>
      </TryShell>
    </Suspense>
  )
}
