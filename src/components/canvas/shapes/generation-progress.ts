/**
 * What the panel says while a design is on its way.
 *
 * Two stages, because the wait has two halves that look the same from the
 * canvas and are not: the route holds its headers until the model's first
 * word, which is most of a minute, and only then does markup start to
 * arrive. "Reading your sketch" is the first half, "Writing the page" the
 * second, and the clock beside them is what makes eighty seconds of nothing
 * read as progress rather than a hang. The stage is read off the markup
 * itself rather than a flag, so it cannot disagree with what is on screen.
 *
 * Pure, and beside the component rather than in it, because the component
 * needs a store and a browser to render and this is the part with words in.
 */
export const generationStage = (html: string | undefined): string =>
  html ? 'Writing the page' : 'Reading your sketch'

/** Elapsed time as a clock would say it: "12s", then "1m 12s". */
export const formatElapsed = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

/** The expectation set under the clock, so a minute does not read as a fault. */
export const GENERATION_TAKES = 'Most pages take a minute or two.'

/** What a panel with no markup and nothing on the way says. */
export const NOTHING_ARRIVED = 'Nothing arrived for this design. Generate it again from the frame.'
