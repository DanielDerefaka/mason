import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AppProviders } from '@/components/app-providers'

import { api } from '../../../convex/_generated/api'

/**
 * Out of the index, all three screens.
 *
 * The brand SERP was showing "Sign in" as a sitelink: a login form listed
 * under the name, in the row where the pages that say what Mason is belong.
 * Nobody searches for it and it is the opposite of a definitional URL.
 * noindex is right in every state these screens have — a form for people
 * who already have an account, or, for sign-up during the free week, a
 * redirect to /try.
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
 * through.
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
 *
 * The free week does not close this layout, and it used to: `isFreeWeek()`
 * sent every auth screen to /try, sign-in included, on the theory that half a
 * door is worse than none. What that shut was every account made before the
 * week began — a subscriber who pressed "Sign in" landed on the guest canvas
 * with no way back to their own work, for seven days, on a site whose header
 * still showed the link. The week's promise is that nothing *needs* an
 * account, which is a fact about /try and not a reason to lock out the people
 * who already have one. Only sign-up closes during the week, and it closes in
 * `sign-up/layout.tsx`, because a shared layout cannot see which of its
 * children is rendering and this is the one place all three meet.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const token = await convexAuthNextjsToken()
  const user = token ? await fetchQuery(api.user.getCurrentUser, {}, { token }) : null
  if (user && !user.isAnonymous) redirect('/dashboard')
  return <AppProviders>{children}</AppProviders>
}
