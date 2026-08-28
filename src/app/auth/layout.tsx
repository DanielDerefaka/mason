import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { redirect } from 'next/navigation'

import { api } from '../../../convex/_generated/api'

/**
 * Sends a signed-in *account* to the dashboard, and lets everyone else
 * through.
 *
 * The middleware used to do this, by listing the auth screens as public
 * routes. It could not tell an account from a guest, and a guest is an
 * authenticated session: "Keep your work" would send them here, here would
 * send them to /dashboard, and /dashboard sends anonymous users back to /try.
 * The way out of a guest session ran in a circle. This runs after the session
 * is resolved, so it can ask the question the middleware could not.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const token = await convexAuthNextjsToken()
  const user = token ? await fetchQuery(api.user.getCurrentUser, {}, { token }) : null
  if (user && !user.isAnonymous) redirect('/dashboard')
  return children
}
