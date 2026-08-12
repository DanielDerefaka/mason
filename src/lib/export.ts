import { buildDesignPrompt } from '@/lib/prompt-export'
import { buildProject, projectFilename } from '@/lib/project-export'
import { rasteriseFrame } from '@/lib/rasterise'
import { DESIGN_SCOPE, sanitiseHtml } from '@/lib/sanitise'
import type { Shape } from '@/redux/slice/shapes'
import type { StyleGuide } from '@/types/style-guide'
import { zip } from '@/lib/zip'

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
/**
 * Photograph slots point at this application by relative path, which is right
 * everywhere the design is rendered by us — the canvas, the editor, the
 * preview, a share link — and wrong in a file on someone's desktop, where
 * there is no origin to be relative to. So the file gets absolute ones.
 *
 * The exported page therefore loads its photographs through this deployment.
 * That is the trade for keeping the API key on the server: the alternative is
 * resolving every slot to its stock URL at export time, which means a network
 * round trip per image before the download can start.
 */
const absoluteImageUrls = (html: string) =>
  html.replace(/(["'(])\/api\/image\//g, `$1${window.location.origin}/api/image/`)

export const exportDesignHtml = (design: Shape, styleGuide?: StyleGuide | null) => {
  const sanitised = sanitiseHtml(design.html ?? '')
  const fragment = absoluteImageUrls(sanitised)
  const usesPhotos = fragment.includes('/api/image/')

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
    <!-- The design's own stylesheet is scoped beneath this class, so the
         wrapper has to travel with it or the exported page loses every hover,
         focus and selected state. -->
    <div class="${DESIGN_SCOPE}">
${fragment}
    </div>${
    usesPhotos
      ? `
    <!-- Pexels asks that photographs be credited wherever they are shown. -->
    <p style="margin:0;padding:16px;text-align:center;font-size:12px;opacity:0.55">
      Photographs via <a href="https://www.pexels.com" style="color:inherit">Pexels</a>.
    </p>`
      : ''
  }
  </body>
</html>
`

  download(new Blob([doc], { type: 'text/html' }), `${slug(design.label ?? 'design')}.html`)
}

/**
 * The design as a build brief rather than a build.
 *
 * Markdown, because the audience is a coding agent or a developer reading it
 * in an editor, and both handle a table better than they handle a zip.
 */
export const exportDesignPrompt = (design: Shape, styleGuide?: StyleGuide | null) => {
  const prompt = buildDesignPrompt(design, styleGuide ?? null)
  download(new Blob([prompt], { type: 'text/markdown' }), `${slug(design.label ?? 'design')}.md`)
  return prompt
}

/**
 * The design as a project that runs.
 *
 * The third and least lossy of the three: a Next.js app with the palette as
 * tokens, a component per section, and the markup translated to Tailwind. The
 * brief describes the design to somebody who will rebuild it; this is the
 * rebuild.
 */
export const exportDesignProject = (design: Shape, styleGuide?: StyleGuide | null) => {
  const files = buildProject(design, styleGuide ?? null, { origin: window.location.origin })
  download(new Blob([zip(files)], { type: 'application/zip' }), projectFilename(design))
  return files
}
