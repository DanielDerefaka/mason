import { redirect } from 'next/navigation'
import { subscriptionEntitlementQuery } from '@/convex/query.config'

/**
 * Not the dashboard itself — a routing step. It decides where a signed-in user
 * belongs and forwards them there.
 */
export default async function DashboardPage() {
  const { user, session, entitled } = await subscriptionEntitlementQuery()

  if (!user || !session) redirect('/auth/sign-in')
  // TODO: remove hardcoded billing path once the billing route exists.
  if (!entitled) redirect('/billing')

  redirect(`/dashboard/${session}`)
}
