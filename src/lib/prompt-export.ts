import { primaryFamily } from '@/lib/fonts'
import type { Shape } from '@/redux/slice/shapes'
import type { StyleGuide } from '@/types/style-guide'

/**
 * The design as a brief another agent can build from.
 *
 * The HTML export hands over a finished artefact; this hands over the
 * instructions. It is the more useful of the two for the common case — somebody
 * wants this design in *their* stack, with their component library and their
 * conventions, and a file of inline-styled divs is the wrong shape for that.
 *
 * Everything here is already known: the palette, the type scale, the radii and
 * the section structure are read off the design and its style guide rather than
 * inferred, so the brief states measurements instead of adjectives. A builder
 * that has to guess a colour has been failed by the brief.
 */

/** A section, as far as a reader of the page is concerned. */
type Section = { tag: string; heading: string; summary: string }

/**
 * Reads the page's top-level structure.
 *
 * Only the outermost run of elements: a design's real sections are its direct
 * children, and descending further produces an outline of every card on the
 * page rather than an outline of the page.
 */
const readSections = (html: string): Section[] => {
  if (typeof window === 'undefined') return []

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const root =
    doc.body.children.length === 1 ? (doc.body.firstElementChild as HTMLElement) : doc.body

  return Array.from(root.children).map((child) => {
    const heading = child.querySelector('h1, h2, h3')?.textContent?.trim() ?? ''
    const paragraph = child.querySelector('p')?.textContent?.trim() ?? ''

    // What the section is made of matters more than its prose.
    const parts: string[] = []
    const count = (selector: string, label: string) => {
      const n = child.querySelectorAll(selector).length
      if (n > 0) parts.push(`${n} ${label}${n === 1 ? '' : 's'}`)
    }
    count('img', 'image')
    count('button', 'button')
    count('a', 'link')
    count('input, textarea, select', 'form control')

    return {
      tag: child.tagName.toLowerCase(),
      heading,
      summary: [paragraph.slice(0, 90), parts.join(', ')].filter(Boolean).join(' — '),
    }
  })
}

const swatchLines = (guide: StyleGuide) =>
  guide.colorSections
    .flatMap((section) =>
      section.swatches.map(
        (swatch) =>
          `| \`${swatch.token}\` | ${swatch.color.toUpperCase()} | ${swatch.name}${swatch.description ? ` — ${swatch.description}` : ''} |`,
      ),
    )
    .join('\n')

const typeLines = (guide: StyleGuide) => {
  if (guide.typeScale?.length) {
    return guide.typeScale
      .map(
        (style) =>
          `| ${style.name} | ${style.fontSize}px | ${style.fontWeight} | ${style.lineHeight} | ${style.letterSpacing}em | ${style.usage} |`,
      )
      .join('\n')
  }
  return guide.typography.styles
    .map((style) => `| ${style.name} | — | ${style.weight} | — | — | — |`)
    .join('\n')
}

export const buildDesignPrompt = (
  design: Shape,
  guide: StyleGuide | null,
  options: { framework?: string; brandName?: string } = {},
): string => {
  const framework = options.framework ?? 'Next.js (App Router) with Tailwind CSS'
  const sections = readSections(design.html ?? '')
  const family = guide ? primaryFamily(guide.typography.fontFamily) : null

  const lines: string[] = [
    `# Build: ${options.brandName || design.label || 'Untitled design'}`,
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
      `**${guide.theme}** — ${guide.description}`,
      '',
      '## Colour',
      '',
      'Define these as CSS custom properties on the root and reference them by token.',
      'Do not substitute near-equivalents from a default palette.',
      '',
      '| Token | Hex | Use |',
      '| --- | --- | --- |',
      swatchLines(guide),
      '',
      '## Type',
      '',
      family
        ? `Family: **${family}** (Google Fonts). Load the weights listed below and no others.`
        : 'Family: use the system stack.',
      '',
      '| Style | Size | Weight | Line height | Tracking | Use |',
      '| --- | --- | --- | --- | --- | --- |',
      typeLines(guide),
      '',
    )

    if (guide.radii?.length) {
      lines.push(
        '## Radius',
        '',
        guide.radii
          .map((r) => `- **${r.name}** — ${r.value === 9999 ? 'fully rounded' : `${r.value}px`}`)
          .join('\n'),
        '',
      )
    }

    if (guide.elevation?.length) {
      lines.push(
        '## Elevation',
        '',
        guide.elevation.map((e) => `- **${e.name}** — \`${e.shadow}\` (${e.usage})`).join('\n'),
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
    (design.html ?? '').trim(),
    '```',
    '',
  )

  return lines.join('\n')
}
