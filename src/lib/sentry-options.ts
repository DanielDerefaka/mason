import type { ErrorEvent, EventHint } from '@sentry/nextjs'

/**
 * What every Sentry client in this app shares.
 *
 * The point of this file is the scrubbing. An error report is the one place a
 * secret leaves the server without anyone deciding to send it: a stack frame
 * carries local variables, a failed request carries its headers, and this app
 * holds an Anthropic key, a Polar token, a Convex deploy key and a webhook
 * signing secret. None of them are worth a bug report.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? ''

/** Without a DSN the SDK is a no-op, which is what an unconfigured clone needs. */
export const sentryEnabled = Boolean(SENTRY_DSN)

/** Header names that carry a credential rather than a clue. */
const SECRET_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'anthropic-api-key',
  'webhook-signature',
  'convex-deploy-key',
])

/** Anything shaped like a key, wherever it appears in a message or a value. */
const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{8,}/g,
  /sk-[A-Za-z0-9]{16,}/g,
  /polar_[a-z]{3}_[A-Za-z0-9_-]{8,}/g,
  /whsec_[A-Za-z0-9+/=]{8,}/g,
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
]

const redactString = (value: string) =>
  SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[redacted]'), value)

/**
 * Walks an event and rewrites anything that looks like a credential.
 *
 * The depth cap exists only to bound a pathological structure, and it was
 * originally 6 — which a test caught as far too shallow. The most valuable
 * thing in an error report is also one of the deepest: a captured local
 * variable sits at exception → values → [n] → stacktrace → frames → [n] →
 * vars → name, which is eight levels down. A cap that stops before the stack
 * frames scrubs everything except the place a key is most likely to be.
 */
const redact = (value: unknown, depth = 0): unknown => {
  if (depth > 12) return value
  if (typeof value === 'string') return redactString(value)
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRET_HEADERS.has(key.toLowerCase()) ? '[redacted]' : redact(item, depth + 1),
      ]),
    )
  }
  return value
}

/**
 * Errors that are true, uninteresting, and would otherwise drown the ones that
 * matter.
 *
 * Deliberately short. A noise filter that grows without discipline becomes the
 * reason a real failure was never seen, so anything added here needs a reason
 * that survives being read out loud.
 */
const IGNORED = [
  // A visitor navigating away mid-request. Nothing failed.
  'AbortError',
  'The user aborted a request',
  // Browser extensions injecting into the page.
  'ResizeObserver loop completed with undelivered notifications',
  'Non-Error promise rejection captured with value: undefined',
]

export const sentryOptions = {
  dsn: SENTRY_DSN,
  enabled: sentryEnabled,
  // A design tool is not high-traffic enough for sampling to matter yet, and
  // a trace is far more useful than the ten it was sampled out of.
  tracesSampleRate: 0.1,
  // Off by default: this app handles people's unpublished work, and a session
  // replay records it. Turn it on deliberately or not at all.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  ignoreErrors: IGNORED,
  beforeSend(event: ErrorEvent, _hint: EventHint) {
    return redact(event) as ErrorEvent
  },
}
