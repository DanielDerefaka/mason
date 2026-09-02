import type { StyleWrite } from './node'

/**
 * The three ways an element in a generated design can be positioned.
 *
 * A design is a flow layout, so "move this" means more than one thing, and the
 * editor used to offer only two of them: reorder it, or take it out of the
 * document. The second is what "Free" did, and it is why moving anything felt
 * destructive. An absolutely positioned element stops holding space, so every
 * sibling below it collapses upwards the instant you switch, whether or not you
 * have moved it yet.
 *
 * `offset` is the missing third. `position: relative` moves the painted box and
 * leaves the space exactly where it was, so the element goes anywhere you drag
 * it and nothing else on the page moves. That is what people mean when they ask
 * why this cannot work like a design tool.
 */
export type Placement = 'flow' | 'offset' | 'free'

/**
 * Read from `position` alone, deliberately.
 *
 * An offset element sitting at 0,0 is indistinguishable from a flow one by
 * geometry, but it is not the same thing to the person editing it: they put it
 * in that mode, and the X and Y fields have to stay live so they can type a
 * number. Judging the mode by whether the offsets are currently non-zero would
 * disable the very inputs that exist to change them.
 */
export const placementOf = (position: string): Placement => {
  if (position === 'absolute' || position === 'fixed') return 'free'
  if (position === 'relative') return 'offset'
  return 'flow'
}

/** Whether dragging should move the element rather than reorder it. */
export const movesByOffset = (placement: Placement) => placement !== 'flow'

/**
 * The styles that put an element into a placement, seeded so the switch itself
 * is invisible.
 *
 * The seeding differs by mode and getting it wrong flings the element across
 * the page, because the two offsets are measured from different origins.
 * `absolute` counts from the containing block, so it has to be seeded with
 * where the element already sits. `relative` counts from the element's *own*
 * normal position, so the equivalent seed is zero: any other value would move
 * it by that much the moment the mode changed.
 */
export const placementWrites = (
  to: Placement,
  at: { offsetLeft: number; offsetTop: number },
): StyleWrite[] => {
  if (to === 'free') {
    return [
      ['position', 'absolute'],
      ['left', `${Math.round(at.offsetLeft)}px`],
      ['top', `${Math.round(at.offsetTop)}px`],
    ]
  }
  if (to === 'offset') {
    return [
      ['position', 'relative'],
      ['left', '0px'],
      ['top', '0px'],
    ]
  }
  // Cleared rather than set to `static`, so returning to the flow gives the
  // element back to the design's own stylesheet instead of pinning it to a
  // value the design never asked for.
  return [
    ['position', ''],
    ['left', ''],
    ['top', ''],
  ]
}

/**
 * What each mode costs, in the words of somebody who is about to press it.
 *
 * The old panel described free placement as "it no longer holds space in the
 * layout", which is accurate and tells you nothing about what you are going to
 * see. What you are going to see is the rest of the page jump.
 */
export const PLACEMENT_COPY: Record<Placement, string> = {
  flow: 'In flow: the layout decides where this sits. Dragging drops it between other elements.',
  offset:
    'Offset: drag it anywhere. It keeps the space it was holding, so nothing else on the page moves.',
  free: 'Free: this comes out of the layout, and everything below it moves up to fill the gap.',
}

export const PLACEMENT_LABEL: Record<Placement, string> = {
  flow: 'In flow',
  offset: 'Offset',
  free: 'Free',
}
