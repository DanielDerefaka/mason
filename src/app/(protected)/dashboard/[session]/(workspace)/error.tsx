'use client'

import { RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

/**
 * The workspace boundary — canvas, style guide, editor and preview.
 *
 * Separate from the root one so a crash here keeps the navbar above it, and
 * the copy can be specific about what survives: shapes autosave, and the
 * editor writes back on every change, so the loss is at most the last edit.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[workspace]', error)
  }, [error])

  return (
    <div className="grid flex-1 place-items-center px-6 py-20">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold">This view stopped working</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Shapes and designs autosave, so at most the last change is lost. Reloading the
          view is usually enough.
        </p>
        {error.digest && (
          <p className="text-muted-foreground mt-4 font-mono text-[11px]">
            Reference {error.digest}
          </p>
        )}
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button onClick={reset} size="sm">
            <RotateCcw className="size-3.5" />
            Reload the view
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Projects</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
