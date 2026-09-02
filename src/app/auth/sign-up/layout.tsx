import { redirect } from 'next/navigation'

import { isFreeWeek } from '@/lib/try/free-week'

export const metadata = { title: 'Create your account' }

/**
 * Closed for the week, alongside sign-in.
 *
 * Accounts are not on offer during the week: the header pill, the hero and
 * /faq all say none is needed, and a registration form reachable from the
 * same page made that a matter of which link you happened to click. So
 * sign-up goes to the canvas, and `../sign-in/layout.tsx` says why the other
 * door closes with it. Here rather than in the shared `../layout.tsx` because
 * a layout does not know which route is under it, and the password reset
 * under that same layout stays open.
 *
 * Reopening is `FREE_WEEK=false` in the environment; sessions already issued
 * are untouched either way, so this closes a door without throwing anyone
 * out.
 */
export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  if (isFreeWeek()) redirect('/try')
  return <>{children}</>
}
