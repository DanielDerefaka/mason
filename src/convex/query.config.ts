import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api } from '../../convex/_generated/api'

/** URL-safe handle used as the /dashboard/[session] segment. */
export const toSessionSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'me'

/**
 * Server-side gate for the dashboard entry page: who is signed in, and are
 * they entitled to use the product.
 *
 * This is a page-level check. A production build would repeat it in a data
 * access layer so a forgotten check on a new page cannot leak access.
 */
export const subscriptionEntitlementQuery = async () => {
  const token = await convexAuthNextjsToken()
  const user = await fetchQuery(api.user.getCurrentUser, {}, { token })

  return {
    user,
    session: user ? toSessionSlug(user.name ?? user.email ?? 'me') : null,
    // TODO: add billing logic — replaced by the real entitlement check when
    // Polar is wired up in a later chapter.
    entitled: true,
  }
}
