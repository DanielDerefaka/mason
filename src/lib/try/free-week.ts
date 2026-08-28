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
