import * as Sentry from '@sentry/nextjs'

import { sentryEnabled, sentryOptions } from '@/lib/sentry-options'

/**
 * Server and edge error reporting.
 *
 * Next calls this once per runtime before anything else runs, which is the only
 * place early enough to catch a failure during startup.
 *
 * Without NEXT_PUBLIC_SENTRY_DSN this does nothing at all — a clone of this
 * repository with no Sentry account must behave exactly as it did before.
 */
export const register = async () => {
  if (!sentryEnabled) return
  Sentry.init(sentryOptions)
}

/**
 * Errors thrown inside a server component, a route handler or middleware.
 *
 * Next reports these through a dedicated hook rather than an uncaught
 * exception, so without wiring it the server errors that matter most — a
 * generation route throwing mid-stream — never reach Sentry at all.
 */
export const onRequestError = Sentry.captureRequestError
