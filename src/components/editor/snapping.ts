/**
 * Pulling a dragged element onto the edges and centres of the ones around it.
 *
 * The infinite canvas has had this since it shipped; the editor never did, so
 * moving a free element inside a design was a matter of eyeballing pixels while
 * the thing you were aligning to sat right there with a measurable edge. This
 * is the same idea as `snapDelta` in `use-canvas.ts` and deliberately not the
 * same code: the canvas snaps shapes, which are rows in a table, and the editor
 * snaps DOM nodes, which are rectangles it has to measure. Sharing the function
 * would mean sharing a shape type with the canvas, and the two would drift into
 * a lowest common denominator that suits neither.
 *
 * Plain rectangles in and plain rectangles out, so the arithmetic can be tested
 * without a document.
 */

export type Rect = { left: number; top: number; width: number; height: number }

/**
 * A line to draw, and how far to draw it.
 *
 * The canvas runs its guides past the edge of the world, which reads as an
 * infinite rule and is right when shapes sit on open space. A design is nested
 * boxes, and a full-height rule through twelve of them says nothing about which
 * two just lined up. `from`/`to` span the moving element and the one it matched,
 * which is the segment Figma draws and the only version that is legible here.
 */
export type Guide = { axis: 'x' | 'y'; at: number; from: number; to: number }

/** Screen pixels of slack before a snap takes hold, divided by zoom at the call site. */
export const SNAP_PX = 6

const right = (rect: Rect) => rect.left + rect.width
const bottom = (rect: Rect) => rect.top + rect.height

type Match = { at: number; shift: number; other: Rect }

/**
 * The closest target within the threshold, or nothing.
 *
 * Closest rather than first: an element being dragged into a tight stack has
 * several edges in range at once, and taking whichever was enumerated first
 * makes the snap depend on document order, which reads as the editor choosing
 * at random.
 */
const nearest = (
  edges: readonly number[],
  targets: readonly { at: number; other: Rect }[],
  threshold: number,
): Match | null => {
  let best: Match | null = null
  for (const edge of edges) {
    for (const target of targets) {
      const shift = target.at - edge
      if (Math.abs(shift) > threshold) continue
      if (!best || Math.abs(shift) < Math.abs(best.shift)) {
        best = { at: target.at, shift, other: target.other }
      }
    }
  }
  return best
}

/**
 * How much further to move a proposed rectangle so it lines up with something.
 *
 * `proposed` is where the drag would land with no snapping at all; the returned
 * `dx`/`dy` are added to that. Left, centre and right are all compared against
 * left, centre and right of every candidate, which is what makes an element
 * line up with the one above it rather than merely land near it.
 */
export const snapDelta = (
  proposed: Rect,
  others: readonly Rect[],
  threshold: number = SNAP_PX,
): { dx: number; dy: number; guides: Guide[] } => {
  if (others.length === 0) return { dx: 0, dy: 0, guides: [] }

  const targetsX = others.flatMap((other) => [
    { at: other.left, other },
    { at: other.left + other.width / 2, other },
    { at: right(other), other },
  ])
  const targetsY = others.flatMap((other) => [
    { at: other.top, other },
    { at: other.top + other.height / 2, other },
    { at: bottom(other), other },
  ])

  const x = nearest(
    [proposed.left, proposed.left + proposed.width / 2, right(proposed)],
    targetsX,
    threshold,
  )
  const y = nearest(
    [proposed.top, proposed.top + proposed.height / 2, bottom(proposed)],
    targetsY,
    threshold,
  )

  const dx = x?.shift ?? 0
  const dy = y?.shift ?? 0
  const landed: Rect = { ...proposed, left: proposed.left + dx, top: proposed.top + dy }

  const guides: Guide[] = []
  if (x) {
    guides.push({
      axis: 'x',
      at: x.at,
      from: Math.min(landed.top, x.other.top),
      to: Math.max(bottom(landed), bottom(x.other)),
    })
  }
  if (y) {
    guides.push({
      axis: 'y',
      at: y.at,
      from: Math.min(landed.left, y.other.left),
      to: Math.max(right(landed), right(y.other)),
    })
  }

  return { dx, dy, guides }
}

/**
 * Whether two guide lists would draw the same thing.
 *
 * A pointermove fires at screen refresh rate and on the great majority of them
 * nothing is snapped at all, so both lists are empty and the overlay does not
 * need re-rendering. `from` and `to` are compared along with `at` rather than
 * ignored as noise: while a snap is holding, the segment is supposed to grow
 * and shrink with the element, and comparing only the line would freeze it at
 * whatever extent it had when the snap first took.
 */
export const sameGuides = (a: readonly Guide[], b: readonly Guide[]): boolean =>
  a.length === b.length &&
  a.every(
    (guide, index) =>
      guide.axis === b[index].axis &&
      guide.at === b[index].at &&
      guide.from === b[index].from &&
      guide.to === b[index].to,
  )
