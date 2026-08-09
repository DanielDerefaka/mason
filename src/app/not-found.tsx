import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/logo-mark'

export const metadata = { title: 'Not found | Mason' }

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md text-center">
        <LogoMark className="text-foreground mx-auto size-8" />
        <h1 className="mt-6 text-2xl font-semibold">That page isn&apos;t here</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          The link may be old, or the project may have been deleted.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="sm">
            <Link href="/dashboard">Back to projects</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
