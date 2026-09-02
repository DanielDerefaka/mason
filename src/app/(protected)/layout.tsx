import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { redirect } from 'next/navigation'

import { AppProviders } from '@/components/app-providers'

import { api } from '../../../convex/_generated/api'

/**
 * Guests are confined to /try.
 *
 * An anonymous session is a real session, so the middleware lets it through to
 * every protected page — and the dashboard, billing and settings all assume an
 * account with an email behind it. A guest who lands here is sent back to the
 * canvas they came from; the way into the rest of the app is "Keep your
 * work", which turns the same user into an account in place.
 *
 * This is also where the app's providers mount. Every screen behind a session
 * uses the Convex client and the store, and the root layout mounts nothing so
 * the marketing pages can prerender.
 */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = await convexAuthNextjsToken()
  const user = token ? await fetchQuery(api.user.getCurrentUser, {}, { token }) : null
  if (user?.isAnonymous) redirect('/try')
  return <AppProviders>{children}</AppProviders>
}
