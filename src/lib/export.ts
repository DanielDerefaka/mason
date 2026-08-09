import { rasteriseFrame } from '@/lib/rasterise'
import { sanitiseHtml } from '@/lib/sanitise'
import type { Shape } from '@/redux/slice/shapes'
import type { StyleGuide } from '@/types/style-guide'

/**
 * Getting work out of the canvas.
 *
 * The audit's blunt version: "the product's output is currently trapped inside
 * it." A frame leaves as a PNG of the sketch, a generated design leaves as a
 * standalone HTML file that opens in a browser with no build step.
 */

/** Turns anything into a filename that will survive a download folder. */
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mason-export'

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Revoked on the next tick: revoking synchronously can beat the click in
  // some browsers and produce an empty file.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const exportFramePng = async (frame: Shape, shapes: Shape[]) => {
  const blob = await rasteriseFrame(frame, shapes, 2)
  download(blob, `${slug(frame.label ?? 'frame')}.png`)
}

/**
 * Wraps the generated fragment in a document.
 *
 * The design's inline styles reference the style guide through CSS variables,
 * so those have to travel with it — without them the exported file renders
 * unstyled, which is the most obvious way an export like this goes wrong.
 */
export const exportDesignHtml = (design: Shape, styleGuide?: StyleGuide | null) => {
  const fragment = sanitiseHtml(design.html ?? '')

  // Same walk the canvas does when it binds the design's variables, so the
  // exported file resolves every token the markup references.
  const variables = (styleGuide?.colorSections ?? [])
    .flatMap((section) => section.swatches)
    .map((swatch) => `        ${swatch.token}: ${swatch.color};`)
    .join('\n')

  const family = styleGuide?.typography.fontFamily
  const font = family
    ? `\n    <link rel="preconnect" href="https://fonts.googleapis.com">\n` +
      `    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        family.split(',')[0].trim().replace(/^['"]|['"]$/g, ''),
      ).replace(/%20/g, '+')}:wght@300;400;500;600;700&display=swap">`
    : ''

  const doc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${(design.label ?? 'Design').replace(/[<>&]/g, '')}</title>${font}
    <style>
      :root {
${variables}
        --font-family: ${family ? `'${family.split(',')[0].trim().replace(/^['"]|['"]$/g, '')}', sans-serif` : 'system-ui, sans-serif'};
      }
      * { box-sizing: border-box; }
      /* The design paints its own root, but only inside its column. Without
         this the page shows white gutters either side of a dark design. */
      body {
        margin: 0;
        background: var(--background);
        color: var(--foreground);
        font-family: var(--font-family);
      }
    </style>
  </head>
  <body>
${fragment}
  </body>
</html>
`

  download(new Blob([doc], { type: 'text/html' }), `${slug(design.label ?? 'design')}.html`)
}
