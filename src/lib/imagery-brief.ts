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
    'For photographic slots use https://loremflickr.com/{width}/{height}/{keywords}?lock={n}',
    'with keywords drawn from the product and a different lock number per image.',
  ].join(' ')
}
