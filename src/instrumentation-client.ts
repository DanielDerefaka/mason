import * as Sentry from '@sentry/nextjs'

import { sentryEnabled, sentryOptions } from '@/lib/sentry-options'

/**
 * Browser error reporting.
 *
 * The canvas and the editor are where this app is most likely to break in a way
 * only the person using it can see — a drag that throws, a design that fails to
 * mount — and none of that reaches a server log.
 */
if (sentryEnabled) Sentry.init(sentryOptions)

/** Lets Sentry tie a slow navigation to the route that caused it. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
