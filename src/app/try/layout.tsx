import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Try Mason',
  description:
    'Sketch an interface and watch Mason build it — one free generation a day from the community pool, no account needed.',
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
