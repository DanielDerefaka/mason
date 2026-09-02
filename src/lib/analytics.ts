import { posthogEnabled } from '@/lib/posthog'

/**
 * Product events, and the two places they go.
 *
 * Until this file existed the funnel was unmeasured. PostHog was initialised
 * and DataFast ran on every page, and neither was ever told that a shape had
 * been placed, a generation clicked or an account created: `capture(` and
 * `datafast(` occurred nowhere in `src/`. Autocapture sees a click on an
 * element; it does not see a generation that came back empty, a guest refused
 * at the network cap or a sign-up that failed, which are the steps the launch
 * is judged on.
 *
 * One registry, one call. `track` fans an event out to whichever providers
 * are on the page and is a no-op everywhere else, so a call site never has to
 * know which analytics a deployment runs, and it never throws: a counter is
 * not worth failing a generation over. The names take DataFast's shape, the
 * stricter of the two: lowercase letters, digits and underscores, at most 32
 * characters. `analytics.test.ts` holds every name to that rule and every
 * call site in `src/` to this list, so a typo is a failing test rather than a
 * chart that stays empty.
 */
export const EVENTS = [
  'first_shape_placed',
  'frame_preset_picked',
  'generate_clicked',
  'generation_succeeded',
  'generation_failed',
  'generation_empty',
  'pool_exhausted_shown',
  'byok_dialog_opened',
  'guest_admitted',
  'guest_refused',
  'design_opened',
  'export_clicked',
  'share_created',
  'explore_remix_clicked',
  'signup_viewed',
  'signup_submitted',
  'signup_failed',
] as const

export type EventName = (typeof EVENTS)[number]

/** Whatever a call site knows, in the types it has it in. */
export type EventProps = Record<string, string | number | boolean | null | undefined>

/** DataFast's rule for a goal name, and for a property key. */
export const DATAFAST_NAME = /^[a-z0-9_]{1,32}$/
/** DataFast keeps a property value to 255 characters and a goal to 10 of them. */
const DATAFAST_VALUE_LENGTH = 255
const DATAFAST_PROPERTY_LIMIT = 10

/**
 * The slice of posthog-js this file uses, so that neither the SDK nor its
 * types are imported statically: `instrumentation-client.ts` loads the SDK
 * off the hydration path, and a static import here would put it straight
 * back on.
 */
type PostHogLike = {
  capture: (event: string, properties?: EventProps) => unknown
  identify: (distinctId: string) => unknown
  /** False until `init` has run. Undefined on the script-tag stub, which queues. */
  __loaded?: boolean
}

type ProviderWindow = Window & {
  posthog?: PostHogLike
  datafast?: (goal: string, properties?: Record<string, string>) => void
}

/** Null during SSR, where there is nobody to count. */
const providers = (): ProviderWindow | null =>
  typeof window === 'undefined' ? null : (window as ProviderWindow)

/** A provider that throws must not take the feature down with it. */
const quietly = (fn: () => void) => {
  try {
    fn()
  } catch {
    // Analytics only.
  }
}

/**
 * How long an event waits for a PostHog that has not finished initialising.
 *
 * `signup_viewed` fires on mount, and with the SDK loaded lazily that can be
 * before `init` has run. posthog-js drops a `capture` on an uninitialised
 * instance with a console warning, so the event waits for `__loaded` instead:
 * a few seconds at most, then it is let go.
 */
const LOAD_POLL_MS = 250
const LOAD_POLL_LIMIT = 20

const onceLoaded = (instance: PostHogLike, use: (instance: PostHogLike) => void, tries = 0) => {
  if (instance.__loaded !== false) {
    quietly(() => use(instance))
    return
  }
  if (tries >= LOAD_POLL_LIMIT) return
  setTimeout(() => onceLoaded(instance, use, tries + 1), LOAD_POLL_MS)
}

/**
 * The SDK singleton, imported once however many events ask for it.
 *
 * One promise, not one per call: two events fired in the same tick would
 * otherwise start two imports of the same chunk, and the module that answers
 * the second is not guaranteed to be the module that answered the first.
 * Resolves to null when the chunk fails to load, which is not this file's
 * problem to report.
 */
let sdk: Promise<PostHogLike | null> | null = null

const loadSdk = (): Promise<PostHogLike | null> => {
  sdk ??= import('posthog-js')
    .then(({ default: instance }) => instance as unknown as PostHogLike)
    .catch(() => null)
  return sdk
}

/**
 * Finds the PostHog the page has.
 *
 * The npm build never puts itself on `window`: its instances live in a private
 * map, and only the script-tag snippet assigns `window.posthog`. So `window`
 * is checked first for the day that changes, and otherwise the SDK singleton
 * is reached by dynamic import, which resolves to the very module
 * `instrumentation-client.ts` initialised. Nothing is initialised twice, and
 * without a project key nothing is imported at all.
 */
const withPostHog = (use: (instance: PostHogLike) => void): void => {
  const page = providers()
  if (!page) return
  if (page.posthog) {
    onceLoaded(page.posthog, use)
    return
  }
  if (!posthogEnabled) return
  void loadSdk().then((instance) => {
    if (instance) onceLoaded(instance, use)
  })
}

/** DataFast takes strings only, under its own limits; the rest is dropped. */
const datafastProperties = (props: EventProps | undefined): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || !DATAFAST_NAME.test(key)) continue
    if (Object.keys(out).length >= DATAFAST_PROPERTY_LIMIT) break
    out[key] = String(value).slice(0, DATAFAST_VALUE_LENGTH)
  }
  return out
}

/** Records that `event` happened, wherever anything is listening. */
export const track = (event: EventName, props?: EventProps): void => {
  const page = providers()
  if (!page) return
  if (typeof page.datafast === 'function') {
    quietly(() => page.datafast?.(event, datafastProperties(props)))
  }
  withPostHog((instance) => instance.capture(event, props))
}

/**
 * Names the person behind this browser's events.
 *
 * Called with the Convex user id once a sign-in resolves, so the anonymous
 * guest and the account they became are one person in PostHog rather than
 * two: everything captured before the merge is attached to the id after it.
 * DataFast has no equivalent here; its visitors stay visitors.
 */
export const identify = (id: string): void => {
  withPostHog((instance) => instance.identify(id))
}
