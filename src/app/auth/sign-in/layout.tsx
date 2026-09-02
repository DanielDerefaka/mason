import { redirect } from 'next/navigation'

import { isFreeWeek } from '@/lib/try/free-week'

export const metadata = { title: 'Sign in' }

/**
 * Closed for the week, alongside sign-up.
 *
 * The week is /try and nothing else: no account is offered and none is
 * reachable, so the two doors close together and open together. An earlier
 * version of this decision kept sign-in open on the grounds that shutting it
 * strands the accounts made before the week, which it does — the founder's
 * call on 2026-09-03 is that during the week there is one product surface and
 * one link to it, and that a door which only some visitors can open is worse
 * than a week with no doors at all. Sessions already issued are untouched by
 * this: it refuses a new sign-in, it does not sign anybody out.
 *
 * `forgot-password` stays open deliberately, so a reset started before the
 * week can still be finished; the resulting password is usable the moment
 * `FREE_WEEK` is unset.
 *
 * Here rather than in the shared `../layout.tsx` because a layout cannot see
 * which of its children is rendering, and that shared version is exactly what
 * closed the password reset by accident the last time this was tried.
 */
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  if (isFreeWeek()) redirect('/try')
  return <>{children}</>
}
