export const plural = (n: number) => `${n} credit${n === 1 ? '' : 's'}`

/**
 * What a guest can spend right now, in words.
 *
 * It read "1 pool + 1 credit". "Pool" is the name of the mechanism, shared by
 * nobody outside this codebase, and a sum of two things that are not the
 * same thing reads as an equation. The pool turn is a free generation the
 * visitor has today; a credit is one they earned. Each is named as what it
 * is, and the two are listed, not added. With nothing left there is a
 * sentence rather than a zero, since "0 credits" says nothing about tomorrow.
 */
export const guestCredits = ({ poolAvailable, bonus }: { poolAvailable: boolean; bonus: number }) => {
  const parts: string[] = []
  if (poolAvailable) parts.push('1 free turn today')
  if (bonus > 0) parts.push(plural(bonus))
  return parts.length > 0 ? parts.join(', ') : 'No turns left today'
}

/** An account sees its balance, the way the dashboard shows it. */
export const accountCredits = (balance: number | null | undefined) =>
  balance == null ? '…' : plural(balance)
