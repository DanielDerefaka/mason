import type { Shape } from '@/redux/slice/shapes'

/** An Explore item's sketch: the frame and the shapes that were drawn inside it. */
export type RemixPayload = { frame: Shape; shapes: Shape[] }

/** Room between the rightmost thing already on the canvas and the remixed sketch. */
export const REMIX_GAP = 120

/**
 * Copies somebody else's sketch onto this canvas.
 *
 * Everything gets a fresh id, because the payload's ids are whatever the
 * original author's canvas stamped and a second remix of the same item — or
 * the author remixing their own — would otherwise collide with shapes that are
 * already here. `sourceFrameId` follows the frame to its new id so a design
 * later generated from the copy still knows which frame it came from.
 *
 * The group keeps its internal layout and moves as one: to the right of
 * whatever is already on the canvas, top-aligned with the shape it lands
 * beside so it appears where the eye already is, or at the origin when the
 * canvas is empty. Points move with the boxes, since the canvas draws paths
 * from `points` and boxes from `x`/`y` and they must agree.
 */
export const remixSketch = (
  payload: RemixPayload,
  existing: Shape[],
  instruction?: string,
): Shape[] => {
  // A JSON round trip rather than a spread: `points` and `text` are nested,
  // and the caller keeps the payload for the next remix.
  const copies = JSON.parse(JSON.stringify([payload.frame, ...payload.shapes])) as Shape[]

  const ids = new Map<string, string>()
  for (const shape of copies) ids.set(shape.id, crypto.randomUUID())

  const left = Math.min(...copies.map((shape) => shape.x))
  const top = Math.min(...copies.map((shape) => shape.y))

  let dx = -left
  let dy = -top
  if (existing.length > 0) {
    const rightmost = existing.reduce((best, shape) =>
      shape.x + shape.width > best.x + best.width ? shape : best,
    )
    dx = rightmost.x + rightmost.width + REMIX_GAP - left
    dy = rightmost.y - top
  }

  for (const shape of copies) {
    shape.id = ids.get(shape.id) ?? crypto.randomUUID()
    shape.x += dx
    shape.y += dy
    if (shape.points) {
      shape.points = shape.points.map((point) => ({ x: point.x + dx, y: point.y + dy }))
    }
    if (shape.sourceFrameId !== undefined) {
      const remapped = ids.get(shape.sourceFrameId)
      // A reference to a frame that is not part of the payload would point at
      // nothing on this canvas, so it is dropped rather than carried over.
      if (remapped) shape.sourceFrameId = remapped
      else delete shape.sourceFrameId
    }
  }

  const [frame] = copies
  if (instruction !== undefined) frame.instruction = instruction

  return copies
}
