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

/**
 * The marker a route appends when the model finished cleanly but produced
 * nothing usable.
 *
 * Seen in an audit: a generation returned 200 after twenty seconds with an
 * empty body. The stream had not errored, so the refund path never ran, and
 * the canvas sat on "Waiting for the first chunk" forever while the credit was
 * gone. Success and silence were indistinguishable.
 *
 * A short body is treated the same way as no body. Nothing under this length
 * can be a design, and a stray newline or a lone fence is a likelier
 * explanation than a page.
 */
export const EMPTY_MARKER = '<!--mason:empty-->'

/** Below this, whatever came back is not a design. */
export const MIN_USABLE_MARKUP = 40

export const wasEmpty = (markup: string) => markup.includes(EMPTY_MARKER)

export const isUnusable = (markup: string) =>
  markup.replace(/```[a-z]*/gi, '').trim().length < MIN_USABLE_MARKUP

export const stripOutcomeMarkers = (markup: string) =>
  markup.replace(TRUNCATION_MARKER, '').replace(EMPTY_MARKER, '')
