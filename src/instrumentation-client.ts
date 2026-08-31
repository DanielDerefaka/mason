import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'

import { POSTHOG_HOST, POSTHOG_KEY, posthogEnabled } from '@/lib/posthog'
import { sentryEnabled, sentryOptions } from '@/lib/sentry-options'

/**
 * Browser error reporting.
 *
 * The canvas and the editor are where this app is most likely to break in a way
 * only the person using it can see — a drag that throws, a design that fails to
 * mount — and none of that reaches a server log.
 */
if (sentryEnabled) Sentry.init(sentryOptions)

if (posthogEnabled) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
    // Session replay is a PostHog project switch, not a default we turn on
    // from here. Autocapture is enough to see whether /try and the new pages
    // are actually being read.
    capture_exceptions: true,
  })
}

/** Lets Sentry tie a slow navigation to the route that caused it. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
