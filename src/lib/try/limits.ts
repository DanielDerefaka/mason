/**
 * The limits a deployment is allowed to move, and how a value is read.
 *
 * Both of /try's ceilings — how many generations the whole site shares in a
 * day, and how many new guest sessions one network may open — are numbers
 * somebody tunes while the free week is running, not facts about the product.
 * Neither should need a deploy to change, and neither is quoted on a public
 * page for the same reason (`src/lib/marketing-faq.ts` explains that rule).
 *
 * Here rather than in `convex/` because `convex/` imports from `src/lib/try/`
 * already — `pool-day`, `email`, `guest-refusal` — and because the test runner
 * only collects `src/**`. Takes the raw string rather than reading the
 * environment itself, so the parsing can be tested without stubbing anything.
 */

/**
 * A non-negative whole number from an environment variable, or the fallback.
 *
 * The empty string is the case worth naming: `Number('')` is `0`, and `0` is
 * a legitimate value for both of these — a pool of zero and a cap of zero are
 * how you shut the free week off in a hurry. So an unset variable and one set
 * to nothing at all must not read as "zero, deliberately", or `npx convex env
 * set COMMUNITY_POOL_SIZE ""` would silently take the free week off the air
 * with every check still green. Blank means unset; a real `0` still means
 * zero.
 */
export const limitFromEnv = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw.trim() === '') return fallback
  const configured = Number(raw)
  return Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : fallback
}

/**
 * New anonymous sessions one network may open in a UTC day.
 *
 * Ten. It counts a network rather than a person, so one NAT is a household, an
 * office or a lecture hall — which is exactly why it has to be movable while
 * the week is running: a campus that trips this with legitimate visitors on a
 * Tuesday cannot wait for a deploy.
 */
export const DEFAULT_GUEST_SESSIONS_PER_IP_PER_DAY = 10
