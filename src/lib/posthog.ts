/**
 * PostHog, optional.
 *
 * Without a project key the SDK is never initialised, which is what a clone
 * of this repository needs. The key is public by design (it identifies the
 * project) and grants nothing. Session replay stays off here; turn it on in
 * the PostHog project if you want it, not in this file.
 */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

export const posthogEnabled = Boolean(POSTHOG_KEY)
