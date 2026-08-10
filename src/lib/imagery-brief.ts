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
