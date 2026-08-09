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

  /**
   * The scale is the part that makes two screens look like one product. A
   * palette alone never did: every generation used to pick its own sizes and
   * spacing, so a flow came back as five designs that merely shared colours.
   */
  const typeScale = guide.typeScale?.length
    ? [
        'Type scale — use these exact sizes. Do not invent intermediate ones:',
        ...guide.typeScale.map(
          (style) =>
            `  ${style.name}: ${style.fontSize}px / weight ${style.fontWeight} / ` +
            `line-height ${style.lineHeight} / letter-spacing ${style.letterSpacing}em — ${style.usage}`,
        ),
      ].join('\n')
    : null

  const spacing = guide.spacing?.length
    ? `Spacing scale — every padding, gap and margin comes from this set: ${guide.spacing
        .map((step) => `${step}px`)
        .join(', ')}.`
    : null

  const radii = guide.radii?.length
    ? `Corner radii: ${guide.radii
        .map((radius) => `${radius.name} ${radius.value === 9999 ? '9999px' : `${radius.value}px`}`)
        .join(', ')}. Controls take the smallest, cards the middle.`
    : null

  const elevation = guide.elevation?.length
    ? [
        'Shadows — use these verbatim, and only these:',
        ...guide.elevation.map((level) => `  ${level.name}: ${level.shadow} — ${level.usage}`),
      ].join('\n')
    : null

  const ramps = guide.ramps?.length
    ? [
        'Colour ramps — prefer a step from these over a colour you mix yourself:',
        ...guide.ramps.map(
          (ramp) =>
            `  ${ramp.name}: ${ramp.steps
              .map((step) => `${step.step}=${step.color}`)
              .join('  ')}`,
        ),
      ].join('\n')
    : null

  return [
    `Theme: ${guide.theme} — ${guide.description}`,
    `Font family: ${guide.typography.fontFamily}`,
    `Weights available: ${guide.typography.styles.map((s) => s.weight).join(', ')}`,
    'Colours (already bound to the matching CSS variables):',
    swatches,
    ramps,
    typeScale,
    spacing,
    radii,
    elevation,
  ]
    .filter(Boolean)
    .join('\n')
}
