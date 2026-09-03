/**
 * Why the +2 for sharing is not on offer, in words the sheet can print.
 *
 * The out-of-credits sheet used to hide the share row whenever the bonus was
 * off, with nothing in its place. A guest who had generated once, had the
 * design refunded and cut, and was now out of credits saw a sheet with one
 * button on it and no word on the share the banner had promised them. The
 * row stays; this is the line under it.
 *
 * Null for an account, which has no bonus and nothing to explain, and null
 * for a guest who can still earn it. The two conditions mirror
 * `canClaimShare` in convex/guest.ts, which is the rule; this is its voice.
 */
export const shareBonusReason = (
  guest: { shareClaimed: boolean; poolUses: number } | null,
): string | null => {
  if (!guest) return null
  if (guest.shareClaimed) return 'You have already earned the 2 credits for sharing.'
  if (guest.poolUses < 1) return 'Generate a design first, then share it for 2 more.'
  return null
}
