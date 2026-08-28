import type { Shape } from '@/redux/slice/shapes'

/**
 * Below this the "design" is a stub the model never finished. The same number
 * guards `explore.publish`, which refuses to put one in the gallery.
 */
const MIN_HTML_LENGTH = 40

/**
 * The newest finished design on the canvas, or null.
 *
 * Newest last: the canvas appends, so walking the list backwards finds the
 * design the visitor has just watched appear rather than the first one they
 * ever made. A design still streaming is not shareable — the link would open
 * on half a page — and neither is one whose markup never arrived.
 *
 * It lives here, away from the hook, because the hook cannot be unit tested
 * without a store and a browser, and this is the part with a rule in it.
 */
export const latestFinishedDesign = (shapes: Shape[]): Shape | null => {
  for (let index = shapes.length - 1; index >= 0; index -= 1) {
    const shape = shapes[index]
    if (
      shape.kind === 'generated-ui' &&
      !shape.streaming &&
      (shape.html?.length ?? 0) >= MIN_HTML_LENGTH
    ) {
      return shape
    }
  }
  return null
}
