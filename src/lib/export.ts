import { designResetCss } from '@/lib/design-reset'
import { familiesInDesign, googleFontHref, headFamily, weightsInDesign } from '@/lib/design-fonts'
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
const absoluteImageUrls = (html: string, origin: string) =>
  html.replace(/(["'(])\/api\/image\//g, `$1${origin}/api/image/`)

/**
 * Wraps the generated fragment in a document.
 *
 * The design's inline styles reference the style guide through CSS variables,
 * so those have to travel with it — without them the exported file renders
 * unstyled, which is the most obvious way an export like this goes wrong.
 *
 * Apart from the download, so a test can read what a person would open:
 * `download` needs a browser to click in, and while the two were one function
 * the only way to see the exported file was to export one.
 */
export const buildDesignHtml = (
  design: Shape,
  styleGuide: StyleGuide | null,
  options: { origin: string },
): string => {
  const sanitised = sanitiseHtml(design.html ?? '')
  const fragment = absoluteImageUrls(sanitised, options.origin)
  const usesPhotos = fragment.includes('/api/image/')

  // Same walk the canvas does when it binds the design's variables, so the
  // exported file resolves every token the markup references.
  const variables = (styleGuide?.colorSections ?? [])
    .flatMap((section) => section.swatches)
    .map((swatch) => `        ${swatch.token}: ${swatch.color};`)
    .join('\n')

  const family = styleGuide?.typography.fontFamily

  /**
   * Every face the file needs: the guide's, and the ones the design named in
   * its own stylesheet.
   *
   * Only the guide's was ever linked, so a design generated on /try — where
   * there is no guide — downloaded with no font link at all, and one generated
   * with a guide downloaded missing whatever the model paired against it. The
   * file is the artefact somebody shows to somebody else, which makes it the
   * worst place for the typography to be the browser's rather than the
   * design's.
   */
  const faces: string[] = []
  for (const name of [
    family ? headFamily(family) : null,
    // `includeBundled`: this file is opened outside the application, where
    // `next/font` is not carrying Inter or Fraunces for it.
    ...familiesInDesign(fragment, { includeBundled: true }),
  ]) {
    if (name && !faces.some((seen) => seen.toLowerCase() === name.toLowerCase())) faces.push(name)
  }

  // The guide's spread for the guide's family, because a guide names weights
  // this function is not given; the design's own weights for the rest.
  const weights = weightsInDesign(fragment)
  const font =
    faces.length > 0
      ? `\n    <link rel="preconnect" href="https://fonts.googleapis.com">\n` +
        `    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n` +
        faces
          .map(
            (name, index) =>
              `    <link rel="stylesheet" href="${googleFontHref(
                name,
                index === 0 && family ? [300, 400, 500, 600, 700] : weights,
              )}">`,
          )
          .join('\n')
      : ''

  // Indented to sit with the rules around it; the reset is written flush.
  const reset = designResetCss()
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${(design.label ?? 'Design').replace(/[<>&]/g, '')}</title>${font}
    <style>
      :root {
${variables}
        --font-family: ${faces[0] ? `'${faces[0]}', sans-serif` : 'system-ui, sans-serif'};
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
      /* What the design was drawn under in Mason, so this file shows what the
         editor showed. Layered, so the design's own stylesheet always wins. */
${reset}
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
}

export const exportDesignHtml = (design: Shape, styleGuide?: StyleGuide | null) => {
  const doc = buildDesignHtml(design, styleGuide ?? null, { origin: window.location.origin })
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
