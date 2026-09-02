import { frameContents } from '@/lib/frame-manifest'
import { shapeStyleOf, textStyleOf } from '@/lib/text-style'
import type { Point, Shape } from '@/redux/slice/shapes'

/** Matches the canvas surface, so the snapshot looks like what the user drew on. */
const BACKGROUND = '#0A0A0A'

/**
 * The hairline round every filled box. Two boxes in the same purple, one
 * inside the other, were one slab in the PNG: the model could not see the
 * card inside the section, or the three boxes inside the card. A shade
 * lighter than any fill, so it separates nested boxes of any colour.
 */
const EDGE = 'rgba(255,255,255,0.35)'

/** A nested frame is a region marker, so it is outlined rather than filled. */
const FRAME_EDGE = 'rgba(255,255,255,0.4)'

/** Shapes whose geometry is a path rather than a box. */
const PATH_KINDS = new Set(['pencil', 'arrow', 'line'])

/**
 * The longest edge the model will look at.
 *
 * Anthropic downsamples anything larger before it reaches the model, which is
 * the ceiling `src/lib/fetch-image.ts` already applies to references. Repeated
 * here rather than imported because that module pulls in sharp, and this one
 * runs in the browser.
 */
export const MAX_MODEL_EDGE = 1568

/**
 * The scale a frame is rasterised at for the model.
 *
 * It was a flat 2x, which made the Desktop preset 2880 by 2048. The model saw
 * it at 1568 by 1115 whatever was sent, so the upload was three times the
 * bytes for a picture that arrived no sharper; the text in it was legible at
 * either size. Resolution was never what the sketch lacked. A small frame
 * keeps the 2x, because the ceiling is on the long edge, not the multiplier,
 * and the PNG export passes its own scale because a person downloading a
 * frame wants the pixels.
 */
export const scaleFor = (frame: { width: number; height: number }) =>
  Math.min(2, MAX_MODEL_EDGE / Math.max(1, frame.width, frame.height))

/**
 * The three corners of an arrowhead, matching the canvas's SVG marker: a
 * triangle five stroke-widths long and five wide, pointing the way the last
 * segment does, with its tip one stroke-width past the final point (the
 * marker's `refX`). Null when the path has no direction to point in.
 */
export const arrowHeadFor = (points: Point[], lineWidth: number): [Point, Point, Point] | null => {
  const tip = points[points.length - 1]
  if (!tip) return null
  // A hand that stops before it lifts leaves a run of points on the tip, and
  // a zero-length segment has no direction.
  const from = [...points.slice(0, -1)].reverse().find((point) => point.x !== tip.x || point.y !== tip.y)
  if (!from) return null

  const angle = Math.atan2(tip.y - from.y, tip.x - from.x)
  const along = { x: Math.cos(angle), y: Math.sin(angle) }
  const across = { x: -Math.sin(angle), y: Math.cos(angle) }
  const apex = { x: tip.x + along.x * lineWidth, y: tip.y + along.y * lineWidth }
  const base = { x: apex.x - along.x * lineWidth * 5, y: apex.y - along.y * lineWidth * 5 }
  const half = lineWidth * 2.5
  return [
    apex,
    { x: base.x + across.x * half, y: base.y + across.y * half },
    { x: base.x - across.x * half, y: base.y - across.y * half },
  ]
}

/**
 * Loads a stored image for drawing.
 *
 * `crossOrigin` is set before the source because a canvas that has drawn an
 * image without CORS permission is tainted, and `toBlob` then throws — the
 * export would fail wholesale rather than lose one picture. A load that fails
 * resolves to null so the rest of the frame still renders.
 */
const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })

/**
 * A rectangle with rounded corners, as a path. `roundRect` is newer than some
 * of the browsers this runs in, and four `arcTo`s are the same thing.
 */
const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

/**
 * Paints the current path the way the canvas paints the shape: its fill if it
 * has one, then its border if it has one, otherwise the hairline. A box with
 * no fill and a border is an outline and only that, which is the one mark a
 * drawer can make to say "this is different" and the one the old fillRect
 * erased.
 */
const paintBox = (ctx: CanvasRenderingContext2D, shape: Shape) => {
  const style = shapeStyleOf(shape)
  const filled = shape.fill !== 'transparent'

  if (filled) {
    ctx.fillStyle = shape.fill
    ctx.fill()
  }
  if (style.strokeWidth > 0) {
    ctx.strokeStyle = style.strokeColor
    ctx.lineWidth = style.strokeWidth
    ctx.stroke()
  } else if (filled) {
    ctx.strokeStyle = EDGE
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

/**
 * Draws a frame and everything inside it to a PNG.
 *
 * Rasterising the shape data rather than screenshotting the DOM keeps this
 * independent of zoom, scroll and whatever else is on screen — the model always
 * gets the frame at a known size, and it needs no extra dependency.
 *
 * The style a shape carries — stroke or fill, border width, radius, opacity —
 * is honoured, because it used to be the one thing the picture dropped: every
 * box went through `fillRect` in its fill colour, so an outlined box was sent
 * filled, a pill was sent square and an arrow had no head. The drawer's marks
 * are the sketch's emphasis, and the model needs to see them to act on them.
 */
export const rasteriseFrame = async (
  frame: Shape,
  shapes: Shape[],
  scale = scaleFor(frame),
): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(frame.width * scale))
  canvas.height = Math.max(1, Math.round(frame.height * scale))

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get a 2D context')

  // The frame's own colour when it has one, so a sketch drawn on a light page
  // is sent to the model as a light page. Falling back to the canvas default
  // meant a coloured frame exported — and generated — against the wrong ground.
  ctx.fillStyle = frame.fill && frame.fill !== 'transparent' ? frame.fill : BACKGROUND
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Work in frame-local coordinates from here on.
  ctx.scale(scale, scale)
  ctx.translate(-frame.x, -frame.y)

  // The same set the manifest describes, so the words and the picture agree.
  for (const shape of frameContents(frame, shapes)) {
    const style = shapeStyleOf(shape)
    ctx.globalAlpha = shape.kind === 'text' ? 1 : style.opacity
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (PATH_KINDS.has(shape.kind)) {
      const points = shape.points ?? []
      if (points.length < 2) continue
      // The canvas's own floor: a path is always at least a hairline.
      const lineWidth = Math.max(1, style.strokeWidth || 2)
      ctx.strokeStyle = shape.fill
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      points.forEach((point, index) =>
        index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
      )
      ctx.stroke()

      // The canvas draws a marker on the arrow's end; without it the model was
      // shown a line and could not tell which way it pointed.
      const head = shape.kind === 'arrow' ? arrowHeadFor(points, lineWidth) : null
      if (head) {
        ctx.fillStyle = shape.fill
        ctx.beginPath()
        ctx.moveTo(head[0].x, head[0].y)
        ctx.lineTo(head[1].x, head[1].y)
        ctx.lineTo(head[2].x, head[2].y)
        ctx.closePath()
        ctx.fill()
      }
      continue
    }

    if (shape.kind === 'image') {
      // This matters more than the export it was written for: the frame is
      // rasterised and sent to the model as the sketch, so an image placed in
      // a frame is invisible to the generator unless it is drawn here.
      const drawn = shape.src ? await loadImage(shape.src) : null
      if (drawn) {
        // Matches the canvas's object-fit: cover, so the exported picture is
        // framed the way it was on screen rather than stretched to the box.
        const boxRatio = shape.width / shape.height
        const imageRatio = drawn.naturalWidth / drawn.naturalHeight
        const sourceWidth = imageRatio > boxRatio ? drawn.naturalHeight * boxRatio : drawn.naturalWidth
        const sourceHeight = imageRatio > boxRatio ? drawn.naturalHeight : drawn.naturalWidth / boxRatio

        // Clipped to its corners, as on screen, so a rounded image stays one.
        ctx.save()
        roundedRect(ctx, shape.x, shape.y, shape.width, shape.height, style.radius)
        ctx.clip()
        ctx.drawImage(
          drawn,
          (drawn.naturalWidth - sourceWidth) / 2,
          (drawn.naturalHeight - sourceHeight) / 2,
          sourceWidth,
          sourceHeight,
          shape.x,
          shape.y,
          shape.width,
          shape.height,
        )
        ctx.restore()
      }
      if (style.strokeWidth > 0) {
        roundedRect(ctx, shape.x, shape.y, shape.width, shape.height, style.radius)
        ctx.strokeStyle = style.strokeColor
        ctx.lineWidth = style.strokeWidth
        ctx.stroke()
      }
      continue
    }

    if (shape.kind === 'ellipse') {
      ctx.beginPath()
      ctx.ellipse(
        shape.x + shape.width / 2,
        shape.y + shape.height / 2,
        shape.width / 2,
        shape.height / 2,
        0,
        0,
        Math.PI * 2,
      )
      paintBox(ctx, shape)
      continue
    }

    if (shape.kind === 'text') {
      // Typography is editable per shape, so read it rather than assuming
      // 16px white — otherwise both the export and the image the model reads
      // disagree with what is on screen.
      const text = textStyleOf(shape)
      ctx.fillStyle = text.color
      ctx.font =
        `${text.italic ? 'italic ' : ''}${text.fontWeight} ` +
        `${text.fontSize}px "${text.fontFamily}", sans-serif`
      ctx.textBaseline = 'top'

      const lineHeight = text.fontSize * text.lineHeight
      const lines = (shape.label ?? 'Text').split('\n')
      lines.forEach((line, index) => {
        ctx.fillText(line, shape.x, shape.y + index * lineHeight)
      })
      continue
    }

    if (shape.kind === 'frame') {
      // A page has a colour, and a nested frame with one shows it on screen.
      if (shape.fill && shape.fill !== 'transparent') {
        ctx.fillStyle = shape.fill
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height)
      }
      ctx.strokeStyle = FRAME_EDGE
      ctx.lineWidth = 1
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)
      continue
    }

    roundedRect(ctx, shape.x, shape.y, shape.width, shape.height, style.radius)
    paintBox(ctx, shape)
  }

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the frame'))),
      'image/png',
    ),
  )
}
