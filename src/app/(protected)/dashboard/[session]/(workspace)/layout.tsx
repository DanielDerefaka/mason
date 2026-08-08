import { Navbar } from '@/components/navbar'
import { subscriptionEntitlementQuery } from '@/convex/query.config'

export default async function SessionLayout({ children }: { children: React.ReactNode }) {
  const { user } = await subscriptionEntitlementQuery()

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar name={user?.name} image={user?.image} />
      {children}
    </div>
  )
}
