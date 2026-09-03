/**
 * How far a pointer may travel, in screen pixels, and still be a click.
 *
 * A press on a shape starts a move at once, and the first pointermove used to
 * go straight to the store: a hand is never perfectly still, and the snap
 * pulled an edge onto a neighbour within six pixels regardless, so clicking
 * a frame to select it moved it, wrote it, and flipped the header to
 * "Unsaved changes". Three pixels is the marquee's own click test.
 */
export const CLICK_SLOP_PX = 3

export type Press = { x: number; y: number; dragging: boolean }

export const pressAt = (x: number, y: number): Press => ({ x, y, dragging: false })

/**
 * Whether a pointer that went down at `press` is dragging now that it is at
 * (x, y). Once it is, it stays so: a drag that wanders back through its own
 * starting point must keep moving the shape, or it would stick for a moment
 * every time it passed there.
 */
export const isDrag = (press: Press, x: number, y: number) => {
  if (press.dragging) return true
  if (Math.abs(x - press.x) <= CLICK_SLOP_PX && Math.abs(y - press.y) <= CLICK_SLOP_PX) return false
  press.dragging = true
  return true
}
