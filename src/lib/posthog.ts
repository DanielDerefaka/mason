/**
 * PostHog, optional.
 *
 * Without a project key the SDK is never initialised, which is what a clone
 * of this repository needs. The key is public by design (it identifies the
 * project) and grants nothing. Session replay is off in the browser, whatever
 * the project says: `instrumentation-client.ts` initialises the SDK with the
 * recorder disabled, for the reason Sentry's replay is off too. The canvas
 * holds people's unpublished work.
 */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

export const posthogEnabled = Boolean(POSTHOG_KEY)
