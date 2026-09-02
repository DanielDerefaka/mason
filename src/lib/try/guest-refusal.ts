/**
 * Why a guest was refused, in a form that survives the wire.
 *
 * Convex masks a thrown `Error` as "[Request ID: …] Server Error" before
 * anyone outside sees it — deliberately, so an internal failure cannot narrate
 * itself to a stranger. That is right for a fault and wrong for a rule: a
 * visitor who reaches the per-network daily cap was refused on purpose, and
 * the screen they got told them Mason was busy and to refresh in a minute. It
 * is not busy, and no refresh can succeed before midnight UTC.
 *
 * A `ConvexError` carries `data` past that masking, so every deliberate
 * refusal throws one, and `refusalFrom` reads it. Codes rather than
 * sentences: the wording belongs to the screen rendering it, and a string
 * thrown across a boundary is an API.
 *
 * **Whether that data reaches the browser depends on the road.** A mutation
 * the page calls itself, through `useMutation`, hands the `ConvexError` to
 * the client with `data` intact, so the project cap, the share-before-design
 * refusal and a rejected address are all classified in the catch that sees
 * them. The guest sign-in is the exception: in the Next integration `signIn`
 * does not talk to Convex — it posts to /api/auth, which
 * `convexAuthNextjsMiddleware` proxies. The proxy catches the ConvexError and
 * forwards `{ error: error.message }` with a 400, dropping `data`; the client
 * then throws a plain `Error` built from that message, which is the masked
 * one. Both halves of the code are lost between the mutation and the screen,
 * and the first version of this file shipped believing otherwise: /try showed
 * a capped network the generic failure, because the classification it was
 * doing could only ever return `unknown`.
 *
 * So the cap travels as an *absence* instead. `convex/auth.ts` catches it
 * here and returns `null` from `authorize`, which the library reports as a
 * perfectly ordinary sign-in that produced no tokens — 200 through the proxy,
 * nothing to redact — and `signIn` resolves with `{ signingIn: false }`.
 * `refusalFromSignIn` reads that. It is a narrow channel, and it works because
 * the cap is the only rule that refuses a guest *on the way in*; every other
 * refusal is of a session that already exists, over a direct call.
 *
 * Pure and dependency-free, like `pool-day.ts` beside it — `convex/guest.ts`,
 * `convex/project.ts` and `convex/auth.ts` all import this from outside their
 * own directory, so it must not reach for anything either runtime lacks. The
 * check below is a duck test for the same reason.
 */

/** The network has opened its allowance of new guest sessions for the UTC day. */
export const GUEST_IP_CAP = 'guest_ip_cap'

/**
 * The session already holds as many live sketches as a guest may keep. The
 * number is `GUEST_PROJECT_LIMIT` in `project-cap.ts`, and the toast says it.
 */
export const GUEST_PROJECT_CAP = 'guest_project_cap'

/** A share is of a design, and this session has not generated one yet. */
export const GUEST_SHARE_BEFORE_DESIGN = 'guest_share_before_design'

/** What the email gate was given is not an address, by the server's reading. */
export const GUEST_BAD_EMAIL = 'guest_bad_email'

/**
 * What the screen shows. `unknown` covers everything that is not a rule — a
 * dropped request, a missing secret, a real fault — and keeps the "try again"
 * wording, which is honest for all of them.
 */
export type GuestRefusal =
  | 'network-cap'
  | 'project-cap'
  | 'share-before-design'
  | 'bad-email'
  | 'unknown'

const BY_CODE: Record<string, GuestRefusal> = {
  [GUEST_IP_CAP]: 'network-cap',
  [GUEST_PROJECT_CAP]: 'project-cap',
  [GUEST_SHARE_BEFORE_DESIGN]: 'share-before-design',
  [GUEST_BAD_EMAIL]: 'bad-email',
}

/**
 * Classifies a thrown error. Sound inside Convex and in the catch of a direct
 * mutation call, where `data` is still intact — never on the far side of the
 * /api/auth proxy, which has already flattened it.
 *
 * Duck-typed on `data` rather than `instanceof ConvexError`, because one
 * import of `convex/values` here would be a dependency in the file whose
 * comment above promises there are none.
 */
export const refusalFrom = (error: unknown): GuestRefusal => {
  const data =
    typeof error === 'object' && error !== null ? (error as { data?: unknown }).data : undefined
  return (typeof data === 'string' && BY_CODE[data]) || 'unknown'
}

/**
 * Classifies what `signIn` resolved with, which is where the browser learns of
 * a refusal.
 *
 * A sign-in that returns no tokens is not an error and never was one — it is
 * `authorize` having declined, and the cap is the only thing that declines.
 * Anything genuinely broken throws instead, and is classified by the catch.
 */
export const refusalFromSignIn = (result: { signingIn?: boolean } | undefined): GuestRefusal | null =>
  result?.signingIn ? null : 'network-cap'
