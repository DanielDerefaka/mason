import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/logo-mark'

export const metadata = { title: 'Billing | Mason' }

/**
 * /billing is the redirect target for an unentitled user, so it must never be
 * blank — it was four lines returning an empty fragment, which meant a black
 * rectangle with no navbar and no way out. The entitlement check is stubbed to
 * pass today, so nobody lands here; the day it isn't, this is first contact.
 */
export default function BillingPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md text-center">
        <LogoMark className="mx-auto size-8 text-foreground" />

        <h1 className="mt-6 text-2xl font-semibold">Billing isn&apos;t live yet</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Every account gets a starting balance of credits, and there is no way to buy
          more at the moment. One credit covers one generation — a style guide, a screen,
          a page in a flow, or a revision.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="sm">
            <Link href="/dashboard">Go to projects</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">Account settings</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
