import { textStyleOf } from '@/lib/text-style'
import type { Shape } from '@/redux/slice/shapes'

/** Matches the canvas surface, so the snapshot looks like what the user drew on. */
const BACKGROUND = '#0A0A0A'

/** Shapes whose geometry is a path rather than a box. */
const PATH_KINDS = new Set(['pencil', 'arrow', 'line'])

const overlaps = (shape: Shape, frame: Shape) =>
  shape.x < frame.x + frame.width &&
  shape.x + shape.width > frame.x &&
  shape.y < frame.y + frame.height &&
  shape.y + shape.height > frame.y

/**
 * Draws a frame and everything inside it to a PNG.
 *
 * Rasterising the shape data rather than screenshotting the DOM keeps this
 * independent of zoom, scroll and whatever else is on screen — the model always
 * gets the frame at a known size, and it needs no extra dependency.
 */
export const rasteriseFrame = async (
  frame: Shape,
  shapes: Shape[],
  scale = 2,
): Promise<Blob> => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(frame.width * scale))
  canvas.height = Math.max(1, Math.round(frame.height * scale))

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get a 2D context')

  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Work in frame-local coordinates from here on.
  ctx.scale(scale, scale)
  ctx.translate(-frame.x, -frame.y)

  const contents = shapes
    .filter((shape) => shape.id !== frame.id && shape.kind !== 'generated-ui')
    .filter((shape) => overlaps(shape, frame))

  for (const shape of contents) {
    ctx.fillStyle = shape.fill
    ctx.strokeStyle = shape.fill
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (PATH_KINDS.has(shape.kind)) {
      const points = shape.points ?? []
      if (points.length < 2) continue
      ctx.beginPath()
      points.forEach((point, index) =>
        index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
      )
      ctx.stroke()
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
      ctx.fill()
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
      // A nested frame is a region marker, so outline it rather than fill it.
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)
      continue
    }

    ctx.fillRect(shape.x, shape.y, shape.width, shape.height)
  }

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the frame'))),
      'image/png',
    ),
  )
}
