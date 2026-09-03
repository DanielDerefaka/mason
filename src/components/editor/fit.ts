/**
 * How far the artboard can be zoomed, and where it opens.
 *
 * The limits used to be constants inside the editor component; they are here
 * so the opening zoom can be reasoned about without a browser.
 */
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

export const clampZoom = (level: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level))

/** The viewport's own padding, both sides: `p-8` is 32px each. */
export const FIT_MARGIN = 64

/**
 * The zoom a design opens at: whole, if the pane can hold it, else scaled to
 * fit the pane's width.
 *
 * The artboard is laid out at the design's own width and scaled as a picture,
 * so a 1440px page in a 680px pane is the same page smaller rather than the
 * page reflowed at 680px. Reflowing was what the editor did before this
 * existed: the artboard took its width from the room the panels left, and a
 * layout the model wrote for a desktop was judged at a width it was never
 * given, with a headline wrapping to one word a line as the first sign of it.
 * Never above 1: a phone-sized design in a wide pane is shown at its size, not
 * blown up to fill the room.
 */
export const fitZoom = (paneWidth: number, designWidth: number): number => {
  if (!(paneWidth > 0) || !(designWidth > 0)) return 1
  return clampZoom(Math.min(1, (paneWidth - FIT_MARGIN) / designWidth))
}
