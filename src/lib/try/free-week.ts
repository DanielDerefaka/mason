/**
 * The free-week switch, read on the server only.
 *
 * Deliberately not a NEXT_PUBLIC variable: the flag decides where the landing
 * page redirects and where the site's calls to action point, and both of those
 * are rendered on the server. Inlining it into the client bundle would make
 * turning the week off a rebuild rather than an environment change.
 */
export const isFreeWeek = () => process.env.FREE_WEEK === 'true'

/** Where "Start free" goes: straight to the free canvas during the week, else sign-up. */
export const ctaHref = () => (isFreeWeek() ? '/try' : '/auth/sign-up')

/**
 * Bends a link away from a door that is shut.
 *
 * During the week `src/app/auth/layout.tsx` redirects every auth screen to
 * /try, so any link still pointing at one is a link that bounces. The footer
 * used to rewrite `/auth/sign-up` alone and left "Sign in" beside it — which
 * is how a visitor was still being offered an account on a page whose whole
 * promise was that they did not need one.
 *
 * Takes the flag rather than reading it, because the callers are client
 * components and `FREE_WEEK` is a server-side switch.
 */
export const freeWeekHref = (href: string, freeWeek: boolean): string =>
  freeWeek && href.startsWith('/auth') ? '/try' : href
