import { POSTHOG_HOST, POSTHOG_KEY, posthogEnabled } from '@/lib/posthog'
import { sentryEnabled, sentryOptions } from '@/lib/sentry-options'

/**
 * Browser error reporting and product analytics, loaded after the page.
 *
 * The canvas and the editor are where this app is most likely to break in a way
 * only the person using it can see — a drag that throws, a design that fails to
 * mount — and none of that reaches a server log. But Next runs this file before
 * hydration on *every* route, so importing both SDKs statically put ~180 KB of
 * third-party JavaScript ahead of React on /pricing, a page that uses neither.
 * They are dynamic imports fired from an idle callback now: the same reports,
 * off the path that decides when the page becomes interactive.
 */

/** Resolved only once the module has loaded and `init` has run. */
let sentry: typeof import('@sentry/nextjs') | null = null
let loading: Promise<void> | null = null

const loadSentry = () => {
  if (!sentryEnabled || loading) return
  loading = import('@sentry/nextjs').then((module) => {
    module.init(sentryOptions)
    sentry = module
  })
}

const loadPostHog = async () => {
  if (!posthogEnabled) return
  const { default: posthog } = await import('posthog-js')
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
    capture_exceptions: true,
    // The recorder is a further 143 KB and it films the canvas, which holds
    // work nobody has published yet. Autocapture answers what we actually ask
    // of it: whether /try and the new pages are being read. Off here as well as
    // in the project, so a switch flipped in the PostHog UI cannot start a
    // recording this app never agreed to.
    disable_session_recording: true,
  })
}

/** After the first paint, in whatever gap the browser has. */
const whenIdle = (run: () => void) => {
  if (typeof window === 'undefined') return
  // Safari only grew requestIdleCallback in 15, and a `typeof` guard keeps
  // `window` a Window here: `'requestIdleCallback' in window` narrows the
  // fallback branch to `never`, because the DOM lib declares it as always
  // present.
  if (typeof window.requestIdleCallback === 'function')
    window.requestIdleCallback(run, { timeout: 3000 })
  else window.setTimeout(run, 1500)
}

whenIdle(() => {
  loadSentry()
  void loadPostHog()
})

/**
 * Lets Sentry tie a slow navigation to the route that caused it.
 *
 * Next needs this export to exist synchronously, so it forwards to the module
 * once it is there and drops the call before that. A transition in the first
 * seconds of a page is not worth opening a span whose start has already passed.
 */
export const onRouterTransitionStart = (href: string, navigationType: string) => {
  sentry?.captureRouterTransitionStart(href, navigationType)
}
