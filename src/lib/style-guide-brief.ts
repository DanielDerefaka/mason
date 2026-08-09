import type { StyleGuideQuery } from '@/convex/query.config'

/**
 * Turns the stored guide into the block of facts a generation designs against.
 * Shared by the design and workflow routes so a screen and its flow are
 * described to the model in exactly the same terms.
 */
export const describeStyleGuide = (
  guide: Awaited<ReturnType<typeof StyleGuideQuery>>,
  referenceCount: number,
) => {
  if (!guide) {
    // Without a guide the references are the only steer there is, so telling
    // the model to stay neutral here would quietly cancel them out.
    return referenceCount > 0
      ? 'No style guide has been generated for this project, so the CSS variables are unset — write literal colours instead, and take the palette from the reference images.'
      : 'No style guide has been generated for this project, so the CSS variables are unset — write literal colours instead. Choose a restrained, confident palette and a common sans-serif.'
  }

  const swatches = guide.colorSections
    .flatMap((section) => section.swatches)
    .map((swatch) => `  ${swatch.token}: ${swatch.color} — ${swatch.name}${swatch.description ? `. ${swatch.description}` : ''}`)
    .join('\n')

  return [
    `Theme: ${guide.theme} — ${guide.description}`,
    `Font family: ${guide.typography.fontFamily}`,
    `Weights available: ${guide.typography.styles.map((s) => s.weight).join(', ')}`,
    'Colours (already bound to the matching CSS variables):',
    swatches,
  ].join('\n')
}
