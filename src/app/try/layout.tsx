import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// The allowance is not described here on purpose. It is a number that changes
// with the pool, and a description is cached by crawlers and shared long after
// it stops being true; the canvas itself says what is left.
export const metadata: Metadata = {
  title: 'Try Mason free',
  description:
    'Draw a frame, describe what goes in it, and generate working code. No account needed.',
  // og:url is inherited from the root layout, where it is "/" — so without
  // this a shared link to the canvas unfurls claiming to be the home page.
  // The trial is the most-shared URL on the site; it should name itself.
  openGraph: { url: '/try' },
}

/**
 * /try lives outside (marketing) on purpose: it is the app, not a landing
 * page, so it takes the app's dark tokens and a viewport-locked column the
 * canvas can fill. Nothing here is server-dynamic, which is why the pages
 * beneath wrap their client shells in <Suspense> — useSearchParams needs a
 * boundary under a static layout.
 */
export default function TryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {children}
    </div>
  )
}
