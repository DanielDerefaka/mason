import { readDesign, type DesignModel } from '@/lib/design-model'
import type { Shape } from '@/redux/slice/shapes'
import type { StyleGuide } from '@/types/style-guide'

/**
 * The design as a brief another agent can build from.
 *
 * The HTML export hands over a finished artefact, the project export hands
 * over a build; this hands over the instructions. It is the most useful of the
 * three for the common case — somebody wants this design in *their* stack,
 * with their component library and their conventions, and neither a file of
 * inline-styled divs nor a scaffolded Next app is the right shape for that.
 *
 * Everything it states is measured rather than described. The measuring is
 * `design-model.ts`, which the project export reads too, so the brief and the
 * project it sits beside cannot disagree about what the design is.
 */

const swatchLines = (model: DesignModel) =>
  model.tokens.colours
    .map(
      (colour) =>
        `| \`${colour.token}\` | ${colour.hex} | ${colour.name}${colour.description ? ` — ${colour.description}` : ''} |`,
    )
    .join('\n')

const typeLines = (model: DesignModel) =>
  model.tokens.type
    .map(
      (style) =>
        `| ${style.name} | ${style.fontSize ? `${style.fontSize}px` : '—'} | ${style.fontWeight} | ` +
        `${style.lineHeight ?? '—'} | ${style.letterSpacing !== null ? `${style.letterSpacing}em` : '—'} | ` +
        `${style.usage || '—'} |`,
    )
    .join('\n')

export const buildDesignPrompt = (
  design: Shape,
  guide: StyleGuide | null,
  options: { framework?: string; brandName?: string } = {},
): string => {
  const framework = options.framework ?? 'Next.js (App Router) with Tailwind CSS'
  const model = readDesign(design, guide)
  const { sections, tokens } = model
  const family = tokens.family

  const lines: string[] = [
    `# Build: ${options.brandName || model.name}`,
    '',
    `Build this page in **${framework}**. Every value below is measured from an existing`,
    'design rather than described, so use the numbers as given — if something here is',
    'specific, it is specific on purpose.',
    '',
  ]

  if (guide) {
    lines.push(
      `## Design direction`,
      '',
      `**${tokens.theme}** — ${tokens.description}`,
      '',
      '## Colour',
      '',
      'Define these as CSS custom properties on the root and reference them by token.',
      'Do not substitute near-equivalents from a default palette.',
      '',
      '| Token | Hex | Use |',
      '| --- | --- | --- |',
      swatchLines(model),
      '',
      '## Type',
      '',
      family
        ? `Family: **${family}** (Google Fonts). Load the weights listed below and no others.`
        : 'Family: use the system stack.',
      '',
      '| Style | Size | Weight | Line height | Tracking | Use |',
      '| --- | --- | --- | --- | --- | --- |',
      typeLines(model),
      '',
    )

    if (tokens.radii.length) {
      lines.push(
        '## Radius',
        '',
        tokens.radii
          .map((r) => `- **${r.name}** — ${r.value === 9999 ? 'fully rounded' : `${r.value}px`}`)
          .join('\n'),
        '',
      )
    }

    if (tokens.elevation.length) {
      lines.push(
        '## Elevation',
        '',
        tokens.elevation.map((e) => `- **${e.name}** — \`${e.shadow}\` (${e.usage})`).join('\n'),
        '',
      )
    }
  } else {
    lines.push(
      '## Design direction',
      '',
      'No style guide was attached, so derive the palette and type scale from the',
      'markup at the end of this brief rather than inventing one.',
      '',
    )
  }

  if (sections.length > 0) {
    lines.push(
      '## Page structure',
      '',
      'In this order, top to bottom:',
      '',
      ...sections.map((section, index) => {
        const title = section.heading || `${section.tag} section`
        return `${index + 1}. **${title}**${section.summary ? ` — ${section.summary}` : ''}`
      }),
      '',
    )
  }

  lines.push(
    '## How to build it',
    '',
    '- One component per section, composed in a single page.',
    '- Semantic elements: a real `<button>`, a real `<input>`, `<a>` for navigation.',
    '  A div styled to look like a button is not a button.',
    '- Responsive from one implementation, not a separate mobile page. Fluid first —',
    '  no fixed pixel widths on containers, `min-width: 0` on flex children that hold',
    '  text, `clamp()` for display type — then breakpoints at 900px and 640px for what',
    '  fluidity cannot express: a nav collapsing to a menu, columns dropping to one,',
    '  and anything decorative hidden rather than shrunk.',
    '- Images are decorative unless the structure says otherwise; use your own source.',
    '- Match the measurements above exactly. Approximating the palette or the type',
    '  scale is the single most common way a rebuild stops looking like its reference.',
    '',
    '## Reference markup',
    '',
    'The original, as inline-styled HTML. Read it for spacing and structure; do not',
    'paste it — it is the artefact this brief describes, not the deliverable.',
    '',
    '```html',
    model.html,
    '```',
    '',
  )

  return lines.join('\n')
}
