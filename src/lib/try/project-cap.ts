/**
 * How many sketches one anonymous session may keep on /try, and what a guest
 * is told at the cap.
 *
 * A guest gets a new project whenever they want one — a second day of the
 * free week should not mean painting over the first day's canvas — but
 * `createProject` is reachable by anyone who can open a guest session, and
 * without a bound that is an unauthenticated row-insert loop. Counted over
 * live rows rather than the numbering counter, so a guest who tidies up gets
 * the slot back; the bound that matters is how many rows exist at once.
 *
 * Ten is more than a sketch a day for the whole week, and a bill nobody
 * notices. The generation allowance is untouched by any of this: it is keyed
 * to the guest and the day, not to the project, so a new canvas buys no new
 * credits.
 *
 * Policy, not configuration, which is why it is not in `limits.ts` beside
 * the two ceilings a deployment may move: this number is quoted to the
 * visitor, and a figure in copy has to be one that cannot change under them.
 * Here rather than in `convex/project.ts` because the toast that says the
 * number and the mutation that enforces it must read the same constant, and
 * `convex/` already imports from `src/lib/try/`. Dependency-free for the same
 * reason as its neighbours.
 */
export const GUEST_PROJECT_LIMIT = 10

/**
 * A small number in the words copy uses for it. Past twelve it is printed as
 * digits, which is what the house style would do anyway.
 */
const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
]
export const inWords = (n: number): string => WORDS[n] ?? String(n)

/**
 * What /try says when the cap is hit: a title and a description, which is
 * the shape a two-clause toast takes here.
 *
 * Said on the screen and never thrown. The mutation throws the code
 * `GUEST_PROJECT_CAP` instead, because Convex masks a thrown sentence as
 * "Server Error" by the time it reaches a browser — which is what this
 * refusal read as in production, with a "Try again" that could not work.
 *
 * "Open one of them" rather than "archive one": the sketch menu on /try
 * switches between sketches and does not archive, so the only things a guest
 * can actually do at the cap are reuse a canvas or make an account.
 */
export const PROJECT_CAP_REFUSAL = {
  title: `This guest session holds ${inWords(GUEST_PROJECT_LIMIT)} sketches`,
  description: 'Open one of them instead, or make an account to keep more.',
}
