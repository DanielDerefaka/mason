import { redirect } from 'next/navigation'

import { isFreeWeek } from '@/lib/try/free-week'

export const metadata = { title: 'Create your account' }

/**
 * The one auth screen the free week closes.
 *
 * Accounts are not on offer during the week: the header pill, the hero and
 * /faq all say none is needed, and a registration form reachable from the
 * same page made that a matter of which link you happened to click. So
 * sign-up goes to the canvas. Sign-in and the password reset stay open beside
 * it for the accounts that already exist — the shared `../layout.tsx` says
 * what closing them cost. Here rather than there because a layout does not
 * know which route is under it, and this is the only one that should
 * redirect.
 *
 * Reopening is `FREE_WEEK=false` in the environment; sessions already issued
 * are untouched either way, so this closes a door without throwing anyone
 * out.
 */
export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  if (isFreeWeek()) redirect('/try')
  return <>{children}</>
}
