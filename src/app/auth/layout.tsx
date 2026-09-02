import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AppProviders } from '@/components/app-providers'
import { isFreeWeek } from '@/lib/try/free-week'

import { api } from '../../../convex/_generated/api'

/**
 * Out of the index, all three screens.
 *
 * The brand SERP was showing "Sign in" as a sitelink: a login form listed
 * under the name, in the row where the pages that say what Mason is belong.
 * Nobody searches for it and it is the opposite of a definitional URL.
 * noindex is right in both states this layout has — during the free week the
 * screens redirect to /try anyway, and outside it they are a form.
 *
 * It only works because robots.ts no longer disallows /auth/. A crawler kept
 * out by robots.txt never reads the tag, and Google indexed the URL regardless
 * from the header link — which is exactly how a bare "Sign in" with no
 * snippet got into the result in the first place.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * Sends a signed-in *account* to the dashboard, and lets everyone else
 * through — except during the free week, when there is nowhere to go.
 *
 * The middleware used to do this, by listing the auth screens as public
 * routes. It could not tell an account from a guest, and a guest is an
 * authenticated session: "Keep your work" would send them here, here would
 * send them to /dashboard, and /dashboard sends anonymous users back to /try.
 * The way out of a guest session ran in a circle. This runs after the session
 * is resolved, so it can ask the question the middleware could not.
 *
 * The screens sign in through `useAuthActions`, which needs the auth provider
 * above them, so the app's providers mount here rather than in the root; the
 * root mounts nothing, which is what lets the marketing pages prerender.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  /**
   * During the free week there are no accounts, so there are no auth screens.
   *
   * The week's promise is that nothing needs an account, and the export gate
   * now keeps it — it asks for an address. Leaving sign-up reachable made
   * that promise a matter of which link you happened to click: the gate said
   * "no account needed" and the header two pixels above it said "Start free".
   *
   * Sign-in goes with it, deliberately. Half a door is worse than none: an
   * open sign-in is an invitation to look for the sign-up beside it, and
   * there is no account for it to lead to that was not made before the week
   * began. Sessions already issued are untouched — the cookie lasts thirty
   * days — so this closes the door, it does not throw anyone out.
   *
   * Reopening is `FREE_WEEK=false` in the environment, which is also how the
   * landing page comes back.
   */
  if (isFreeWeek()) redirect('/try')

  const token = await convexAuthNextjsToken()
  const user = token ? await fetchQuery(api.user.getCurrentUser, {}, { token }) : null
  if (user && !user.isAnonymous) redirect('/dashboard')
  return <AppProviders>{children}</AppProviders>
}
