import { stripOutcomeMarkers, wasEmpty, wasTruncated } from './truncation'

/**
 * What a streamed revision actually is, once the whole body has arrived.
 *
 * The revise route appends one of two HTML comments when the model did not
 * finish the job: `<!--mason:empty-->` when it produced nothing usable, and
 * `<!--mason:truncated-->` when it stopped at the output ceiling. The canvas
 * chat stored the stream verbatim and said "Done". The sanitiser strips
 * comments, so an empty answer rendered as a blank shape, and a cut-off one as
 * half a page with no footer; in both cases the design that had been there was
 * gone from the shape, the credit had already been refunded by the server, and
 * nothing on screen said anything had gone wrong.
 *
 * Deciding here rather than in the hook means the decision can be tested
 * without a store, a reader or a toast.
 */
export type RevisionOutcome =
  | { kind: 'empty' }
  | { kind: 'truncated'; html: string }
  | { kind: 'ok'; html: string }

export const revisionOutcome = (markup: string): RevisionOutcome => {
  // A blank body with no marker is a route that predates the markers, or a
  // connection that closed before the first chunk. Either way there is
  // nothing to keep.
  if (wasEmpty(markup) || !markup.trim()) return { kind: 'empty' }

  const html = stripOutcomeMarkers(markup)
  return wasTruncated(markup) ? { kind: 'truncated', html } : { kind: 'ok', html }
}
