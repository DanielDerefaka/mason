import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// The allowance is not described here on purpose. It is a number that changes
// with the pool, and a description is cached by crawlers and shared long after
// it stops being true; the canvas itself says what is left.
export const metadata: Metadata = {
  title: 'Try Mason free',
  description:
    'Draw a frame, describe what goes in it, and generate working code. No account needed.',
  // No `openGraph` block here on purpose, though there was one.
  //
  // It existed to override the root's og:url, which used to be the hardcoded
  // "/" — so a shared canvas link unfurled claiming to be the home page. But a
  // child's openGraph replaces the parent's whole object instead of merging
  // into it, so setting one key here quietly dropped og:site_name and og:type
  // from the most-shared page on the site. The root now resolves og:url from
  // the pathname, which gets /try its own URL and keeps the rest.
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
