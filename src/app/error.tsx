'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { LogoMark } from '@/components/logo-mark'

/**
 * The classes `Button` (size "sm", variants "default" and "outline") would
 * have put on these two, written out so the primitive is not imported.
 *
 * A route-level error.tsx ships in the client bundle of every route beneath
 * it, and this one sits at the root, so its imports reach every page on the
 * site. It pulled in `lucide-react` and the `Button` primitive, which the
 * marketing pages used nowhere else, for a screen that appears only after
 * something has already gone wrong. `global-error.tsx` keeps the same rule,
 * for the same reason.
 */
const BUTTON =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'

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
          <button
            type="button"
            onClick={reset}
            className={`${BUTTON} bg-primary text-primary-foreground px-2.5 hover:bg-primary/90`}
          >
            {/* lucide's rotate-ccw, inlined. */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-3.5"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Try again
          </button>
          <Link
            href="/dashboard"
            className={`${BUTTON} border bg-background px-3 shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50`}
          >
            Back to projects
          </Link>
        </div>
      </div>
    </main>
  )
}
