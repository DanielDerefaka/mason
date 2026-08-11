/**
 * What the model is told about pictures.
 *
 * The inspiration board is deliberately *not* offered as an asset library: the
 * references are nearly always screenshots of other sites, and embedding one
 * puts a picture of a website inside the website. They stay vision-only input
 * that shapes the look; anything the layout needs to show comes from stock.
 */
export const describeImagery = (referenceCount: number) => {
  const references =
    referenceCount > 0
      ? `${referenceCount} inspiration image${referenceCount === 1 ? '' : 's'} were supplied for style. Do not embed them.`
      : 'No inspiration images were supplied.'

  return [
    references,
    'For photographic slots use /api/image/{width}/{height}/{keywords}?i={n}',
    'with keywords drawn from the product and a different i number per image.',
  ].join(' ')
}


/**
 * The written reading of the inspiration board.
 *
 * Placed ahead of the imagery rules in the system prompt, because it decides
 * how big the photograph is before the rules decide where it comes from.
 */
export const describeReferenceBrief = (
  brief: import('@/types/style-guide').ReferenceBrief | null,
) => {
  if (!brief) return null

  return [
    'A designer read the inspiration board and wrote this down. Build against it —',
    'it is the reference, restated in words, and nothing else describes the look.',
    '',
    `Carried by: ${brief.carriedBy}`,
    `Imagery: ${brief.imageryRole}`,
    `Type: ${brief.typeScale}`,
    `Light: ${brief.light}`,
    `Density: ${brief.density}`,
    `Palette: ${brief.palette}`,
    '',
    'Signature devices — rebuild these; they are what makes it recognisable:',
    ...brief.signatureDevices.map((device) => `  - ${device}`),
    '',
    'Component anatomy:',
    ...brief.componentAnatomy.map((part) => `  - ${part}`),
    '',
    'Do not do these — they are how this reference is usually missed:',
    ...brief.avoid.map((mistake) => `  - ${mistake}`),
  ].join('\n')
}


/**
 * Who the design is for.
 *
 * A reference says how a design should look; this says what it is. Without it
 * the model invents a company every time, which is why generated pages arrive
 * named Meridian or Verdant rather than the thing somebody is actually
 * building — and why the copy describes a product nobody asked for.
 *
 * Placed after the reference brief in the prompt on purpose: the reference
 * decides the look, and the brand decides the words. Neither should overwrite
 * the other.
 */
export const describeBrand = (
  brand: { name: string; description: string; logoUrl: string | null } | null,
) => {
  if (!brand || (!brand.name && !brand.description)) return null

  const lines = [
    'This design is for a real product. Use its name and what it does — do not',
    'invent a company, a product name, or a tagline for something else.',
    '',
  ]

  if (brand.name) lines.push(`Name: ${brand.name}`)
  if (brand.description) lines.push(`What it is: ${brand.description}`)

  if (brand.logoUrl) {
    lines.push(
      '',
      'A logo was supplied. Put it where the reference puts its wordmark —',
      'usually the top-left of the nav and again in the footer — as:',
      '',
      `    <img src="${brand.logoUrl}" alt="${brand.name || 'Logo'}" style="height:28px;width:auto;display:block">`,
      '',
      'Set a height and leave the width automatic, so a wide logo is not',
      'squashed into a square. Never redraw it as text, and never place it on a',
      'colour that would swallow it.',
    )
  } else if (brand.name) {
    lines.push(
      '',
      'No logo was supplied, so set the name as a wordmark in the design\'s own',
      'typeface, at the weight the reference uses for its own.',
    )
  }

  lines.push(
    '',
    'Every heading, paragraph and label describes this product specifically.',
    'Generic startup copy — "Built to scale", "Seamless access" — is what this',
    'section exists to prevent.',
  )

  return lines.join('\n')
}
