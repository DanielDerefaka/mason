import { stripOutcomeMarkers, wasEmpty, wasTruncated } from '@/lib/truncation'

/**
 * What the node route's answer is, before anything in the tree is touched.
 *
 * The route appends `<!--mason:empty-->` when the model produced nothing
 * usable and `<!--mason:truncated-->` when it stopped at the output ceiling.
 * The editor used to sanitise the body and swap it in regardless: the
 * sanitiser drops comments and the parser closes whatever tags are left open,
 * so a page cut off a third of the way down still parsed to one valid element,
 * replaced the whole design, was autosaved, and the toast said "Applied".
 *
 * The decision is pure so it can be tested without a DOM or a fetch; the
 * caller decides what to do with each kind.
 */
export type NodeAnswer =
  | { kind: 'empty' }
  | { kind: 'truncated' }
  | { kind: 'ok'; html: string }

export const nodeAnswer = (raw: string): NodeAnswer => {
  if (wasEmpty(raw)) return { kind: 'empty' }
  if (wasTruncated(raw)) return { kind: 'truncated' }

  // The model is told not to fence its answer and sometimes does anyway.
  const html = stripOutcomeMarkers(raw)
    .trim()
    .replace(/^```[a-z]*\s*|\s*```$/gi, '')
  return { kind: 'ok', html }
}
