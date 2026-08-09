/**
 * The reference URLs a generated design may embed.
 *
 * Passing the images as vision input tells the model what the look should be;
 * it takes the URLs as well before it can put an actual photograph on the page.
 * Without this a design comes out as flat blocks and SVG placeholders.
 */
export const describeImagery = (urls: string[]) => {
  if (urls.length === 0) return 'No reference images are available. Design without photography.'

  return [
    `${urls.length} reference image${urls.length === 1 ? '' : 's'} are hosted and ready to embed.`,
    'Use these exact URLs, verbatim:',
    ...urls.map((url) => `- ${url}`),
  ].join('\n')
}
