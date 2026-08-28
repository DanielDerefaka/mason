/**
 * How long until the pool resets, in words a banner can hold.
 *
 * Minutes round up rather than down: at 23:59:30 the pool has not reset, and
 * "0m" would say it had. The exact second is never shown — the banner ticks
 * once a minute, and a countdown that visibly jumps by 60 reads as broken.
 */
export const formatCountdown = (ms: number): string => {
  if (ms <= 0) return 'a moment'
  const totalMinutes = Math.ceil(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

/** The same span to the nearest hour — "in 3h" — for a line that is not a clock. */
export const formatRoughCountdown = (ms: number): string => {
  if (ms <= 0) return 'a moment'
  const totalMinutes = Math.ceil(ms / 60_000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  return `${Math.ceil(totalMinutes / 60)}h`
}
