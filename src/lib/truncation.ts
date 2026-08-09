/**
 * The marker a generation route appends when the model stopped because it hit
 * the output limit rather than because it had finished.
 *
 * An HTML comment, so the sanitiser drops it and it can never render — but it
 * survives the raw stream long enough for the client to notice and say so.
 * Silently saving a half-written page is the worst outcome: it looks like a
 * design that came out badly rather than one that was cut off.
 */
export const TRUNCATION_MARKER = '<!--mason:truncated-->'

export const wasTruncated = (markup: string) => markup.includes(TRUNCATION_MARKER)

export const stripTruncationMarker = (markup: string) =>
  markup.replace(TRUNCATION_MARKER, '')
