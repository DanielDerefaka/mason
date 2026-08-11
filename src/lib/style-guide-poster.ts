import { primaryFamily } from '@/lib/fonts'
import type { StyleGuide } from '@/types/style-guide'

/**
 * The style guide as one image.
 *
 * A guide lives on a page inside the app, which is the one place it is least
 * useful — a guide gets pasted into a brief, dropped in a channel, or sent to
 * whoever is building the thing. So it leaves as a single tall PNG that reads
 * on its own: the palette, the type scale set in the guide's own face, the
 * radii, the elevations and the buttons, in that order.
 *
 * Drawn on a canvas rather than screenshotted from the DOM. Rasterising the
 * page would carry the app's chrome, its dark theme and its scroll position
 * into the file; drawing it means the sheet is composed for the page size it
 * actually is, and it comes out identical every time.
 */
const WIDTH = 1400
const PAD = 72
const SCALE = 2

type Ctx = CanvasRenderingContext2D

/** Everything the sheet needs to know that the guide does not state directly. */
const readPalette = (guide: StyleGuide) => {
  const swatches = guide.colorSections.flatMap((section) => section.swatches)
  const find = (token: string) => swatches.find((swatch) => swatch.token === token)?.color

  // The sheet is drawn in the guide's own colours, so a dark guide produces a
  // dark sheet. Falling back to a light neutral rather than the app's theme
  // keeps it legible when a guide is missing a token.
  const background = find('--background') ?? '#ffffff'
  const foreground = find('--foreground') ?? '#111111'
  const muted = find('--muted-foreground') ?? find('--muted') ?? '#6b7280'
  const border = find('--border') ?? '#e5e7eb'
  const primary = find('--primary') ?? foreground
  const primaryForeground = find('--primary-foreground') ?? background

  return { swatches, background, foreground, muted, border, primary, primaryForeground }
}

const roundRect = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/**
 * Loads the guide's family so the specimen is set in the real face.
 *
 * Without this the type scale is drawn in whatever the canvas falls back to,
 * which makes the one part of the sheet that is genuinely about the typeface
 * the one part that does not show it.
 */
const loadFont = async (family: string, weights: number[]) => {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  const href =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}` +
    `:wght@${weights.join(';')}&display=swap`

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.append(link)

  try {
    // Each weight has to be asked for by name or the canvas silently uses the
    // regular cut for a headline that should be black.
    await Promise.all(weights.map((weight) => document.fonts.load(`${weight} 48px "${family}"`)))
    await document.fonts.ready
  } catch {
    // A missing font is not a reason to refuse the export.
  } finally {
    link.remove()
  }
}

export const exportStyleGuidePng = async (guide: StyleGuide, projectName?: string) => {
  const palette = readPalette(guide)
  const family = primaryFamily(guide.typography.fontFamily)
  const scale = guide.typeScale ?? []
  const weights = Array.from(
    new Set([400, 500, 700, ...guide.typography.styles.map((s) => s.weight), ...scale.map((s) => s.fontWeight)]),
  ).sort((a, b) => a - b)

  await loadFont(family, weights)

  // Height is measured by laying the sheet out once with drawing switched off,
  // because a guide with twelve type styles is far taller than one with four
  // and a fixed canvas would either clip it or leave a metre of empty space.
  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) throw new Error('Canvas is unavailable in this browser')

  const height = paint(measure, guide, palette, family, scale, projectName, true)

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser')
  ctx.scale(SCALE, SCALE)

  paint(ctx, guide, palette, family, scale, projectName, false)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not render the style guide')
  return blob
}

/**
 * Lays the sheet out, and optionally draws it.
 *
 * One function for both passes so the measurement can never disagree with the
 * drawing — two implementations of the same layout is how an export ends up
 * with its last section cut in half.
 */
const paint = (
  ctx: Ctx,
  guide: StyleGuide,
  palette: ReturnType<typeof readPalette>,
  family: string,
  scale: NonNullable<StyleGuide['typeScale']>,
  projectName: string | undefined,
  measureOnly: boolean,
): number => {
  const { background, foreground, muted, border, primary, primaryForeground } = palette
  let y = 0

  const draw = (fn: () => void) => {
    if (!measureOnly) fn()
  }

  const setFont = (weight: number, size: number) => {
    ctx.font = `${weight} ${size}px "${family}", system-ui, sans-serif`
  }

  const sectionTitle = (title: string) => {
    y += 64
    draw(() => {
      ctx.fillStyle = muted
      setFont(600, 13)
      ctx.letterSpacing = '0.14em'
      ctx.fillText(title.toUpperCase(), PAD, y)
      ctx.letterSpacing = '0px'
    })
    y += 28
  }

  draw(() => {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, WIDTH, 20000)
    ctx.textBaseline = 'alphabetic'
  })

  /* Header ------------------------------------------------------------- */
  y = 96
  draw(() => {
    ctx.fillStyle = muted
    setFont(500, 13)
    ctx.letterSpacing = '0.14em'
    ctx.fillText((projectName ?? 'STYLE GUIDE').toUpperCase(), PAD, y)
    ctx.letterSpacing = '0px'
  })

  y += 56
  draw(() => {
    ctx.fillStyle = foreground
    setFont(700, 54)
    ctx.fillText(guide.theme, PAD, y)
  })

  y += 40
  draw(() => {
    ctx.fillStyle = muted
    setFont(400, 18)
    ctx.fillText(guide.description.slice(0, 110), PAD, y)
  })

  y += 24
  draw(() => {
    ctx.strokeStyle = border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(WIDTH - PAD, y)
    ctx.stroke()
  })

  /* Palette ------------------------------------------------------------ */
  for (const section of guide.colorSections) {
    sectionTitle(section.title)

    const perRow = 5
    const gap = 16
    const cardWidth = (WIDTH - PAD * 2 - gap * (perRow - 1)) / perRow

    section.swatches.forEach((swatch, index) => {
      const column = index % perRow
      const row = Math.floor(index / perRow)
      const x = PAD + column * (cardWidth + gap)
      const top = y + row * 168

      draw(() => {
        ctx.fillStyle = swatch.color
        roundRect(ctx, x, top, cardWidth, 96, 12)
        ctx.fill()
        // A near-white swatch on a white sheet needs an edge or it vanishes.
        ctx.strokeStyle = border
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = foreground
        setFont(600, 14)
        ctx.fillText(swatch.name, x, top + 122)

        ctx.fillStyle = muted
        setFont(400, 12)
        ctx.fillText(swatch.color.toUpperCase(), x, top + 142)
      })
    })

    y += Math.ceil(section.swatches.length / perRow) * 168 - 32
  }

  /* Type ---------------------------------------------------------------- */
  sectionTitle(`Typeface — ${family}`)

  if (scale.length > 0) {
    for (const style of scale) {
      const size = Math.min(style.fontSize, 72)
      y += size * style.lineHeight

      draw(() => {
        ctx.fillStyle = foreground
        setFont(style.fontWeight, size)
        ctx.letterSpacing = `${style.letterSpacing}em`
        ctx.fillText(style.name, PAD, y)
        ctx.letterSpacing = '0px'

        ctx.fillStyle = muted
        setFont(400, 13)
        ctx.fillText(
          `${style.fontSize}px · ${style.fontWeight} · ${style.lineHeight} · ${style.usage}`,
          WIDTH / 2 + 80,
          y,
        )
      })
      y += 26
    }
  } else {
    // Guides made before the scale existed still have weights to show.
    for (const style of guide.typography.styles) {
      y += 52
      draw(() => {
        ctx.fillStyle = foreground
        setFont(style.weight, 38)
        ctx.fillText(`${style.name} ${style.weight}`, PAD, y)
      })
      y += 18
    }
  }

  /* Radii and elevation -------------------------------------------------- */
  if (guide.radii?.length) {
    sectionTitle('Radius')
    const gap = 16
    const boxWidth = (WIDTH - PAD * 2 - gap * 3) / 4
    guide.radii.slice(0, 4).forEach((radius, index) => {
      const x = PAD + index * (boxWidth + gap)
      draw(() => {
        ctx.fillStyle = palette.swatches.find((s) => s.token === '--muted')?.color ?? border
        roundRect(ctx, x, y, boxWidth, 84, radius.value)
        ctx.fill()
        ctx.fillStyle = muted
        setFont(500, 13)
        ctx.fillText(`${radius.name} · ${radius.value === 9999 ? 'pill' : `${radius.value}px`}`, x, y + 108)
      })
    })
    y += 124
  }

  if (guide.elevation?.length) {
    sectionTitle('Elevation')
    const gap = 24
    const boxWidth = (WIDTH - PAD * 2 - gap * 2) / 3
    guide.elevation.slice(0, 3).forEach((level, index) => {
      const x = PAD + index * (boxWidth + gap)
      draw(() => {
        // The real box-shadow string cannot be handed to a canvas, so the
        // sheet shows a plausible stand-in and prints the value itself — the
        // value is what someone copies anyway.
        ctx.save()
        ctx.shadowColor = 'rgba(0,0,0,0.18)'
        ctx.shadowBlur = 8 + index * 14
        ctx.shadowOffsetY = 2 + index * 6
        ctx.fillStyle = background
        roundRect(ctx, x, y, boxWidth, 84, 12)
        ctx.fill()
        ctx.restore()
        ctx.strokeStyle = border
        ctx.lineWidth = 1
        roundRect(ctx, x, y, boxWidth, 84, 12)
        ctx.stroke()

        ctx.fillStyle = foreground
        setFont(600, 14)
        ctx.fillText(level.name, x + 16, y + 34)
        ctx.fillStyle = muted
        setFont(400, 12)
        ctx.fillText(level.usage.slice(0, 42), x + 16, y + 56)
      })
    })
    y += 124
  }

  /* Buttons -------------------------------------------------------------- */
  sectionTitle('Buttons')
  const radius = guide.radii?.[1]?.value ?? 10
  const buttons: Array<{ label: string; fill: string; text: string; outline?: boolean }> = [
    { label: 'Primary action', fill: primary, text: primaryForeground },
    { label: 'Secondary', fill: palette.swatches.find((s) => s.token === '--muted')?.color ?? border, text: foreground },
    { label: 'Outline', fill: background, text: foreground, outline: true },
  ]

  let x = PAD
  for (const button of buttons) {
    const width = 210
    draw(() => {
      ctx.fillStyle = button.fill
      roundRect(ctx, x, y, width, 52, Math.min(radius, 26))
      ctx.fill()
      if (button.outline) {
        ctx.strokeStyle = border
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      ctx.fillStyle = button.text
      setFont(600, 15)
      ctx.textAlign = 'center'
      ctx.fillText(button.label, x + width / 2, y + 33)
      ctx.textAlign = 'left'
    })
    x += width + 16
  }
  y += 52

  /* Watermark ------------------------------------------------------------ */
  y += 72
  draw(() => {
    ctx.strokeStyle = border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(WIDTH - PAD, y)
    ctx.stroke()
  })

  y += 46
  draw(() => {
    ctx.fillStyle = muted
    setFont(500, 14)
    ctx.fillText('Made with Mason', PAD, y)

    ctx.textAlign = 'right'
    setFont(400, 13)
    ctx.fillText(family, WIDTH - PAD, y)
    ctx.textAlign = 'left'
  })

  return y + 56
}
