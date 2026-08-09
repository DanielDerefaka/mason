'use client'

import { RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/logo-mark'

/**
 * The route-level boundary.
 *
 * Without one, a thrown render error takes the route down to Next's default
 * screen — which in production is a blank page with no way back and no
 * indication whether anything was saved. That matters most in the canvas and
 * the editor, which hold state between autosaves.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[route]', error)
  }, [error])

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md text-center">
        <LogoMark className="text-foreground mx-auto size-8" />

        <h1 className="mt-6 text-2xl font-semibold">Something broke on this screen</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Your work is saved as you go, so what was on the canvas should still be there.
          Try again, and if it keeps happening go back to your projects.
        </p>

        {error.digest && (
          <p className="text-muted-foreground mt-4 font-mono text-[11px]">
            Reference {error.digest}
          </p>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button onClick={reset} size="sm">
            <RotateCcw className="size-3.5" />
            Try again
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to projects</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
