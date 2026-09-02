'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'

import { Toaster } from '@/components/ui/sonner'

/**
 * A Convex client with no session behind it.
 *
 * /explore is the one marketing page that subscribes to the backend from the
 * browser: the gallery pages through `api.explore.list`, which is public, and
 * a card's copy button toasts. Neither needs an auth cookie, so this is a
 * plain `ConvexProvider` rather than `AppProviders`, which would put the auth
 * provider and the Redux store back on a marketing route. One client per
 * module, which is one per browser; the server evaluates the module too and
 * never connects.
 */
const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function PublicConvex({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={client}>
      {children}
      <Toaster theme="dark" />
    </ConvexProvider>
  )
}
