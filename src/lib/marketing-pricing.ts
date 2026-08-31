/**
 * The public pricing page.
 *
 * No dollar figures. Those live in Polar, behind POLAR_PRODUCT_ID, and a
 * number printed here would be quoted by crawlers after the product moved.
 * The page explains the credit model, what is free, and where to start
 * without an account, then points signed-in visitors at billing.
 */

export const PRICING_DESCRIPTION =
  'SketchMason charges for generations, not for drawing. Guests can try the canvas without an account. Signed-in plans are on the billing page.'

export const PRICING_ROWS: { label: string; value: string }[] = [
  { label: 'Style guide from a mood board', value: '1 credit' },
  { label: 'Screen from a sketch', value: '1 credit' },
  { label: 'Each page in a generated flow', value: '1 credit' },
  { label: 'Revision from the design chat', value: '1 credit' },
  { label: 'Canvas, references, history', value: 'Free' },
]

export const PRICING_POINTS: { title: string; body: string }[] = [
  {
    title: 'Try without an account',
    body: 'The canvas at /try lets you draw, generate and edit as a guest. Guests get one generation a day from a pool the whole site shares. Downloading asks for an email once. That address goes on the launch list and the newsletter.',
  },
  {
    title: 'Bring your own key',
    body: 'Paste an Anthropic API key into the canvas and generations run on it. The key stays in the browser tab and is gone when the tab closes. SketchMason never stores it.',
  },
  {
    title: 'Keep the work',
    body: 'A guest session and the projects made in it are kept for fourteen days in the browser you drew in. Making an account keeps the work: the project moves across with its history and its share links.',
  },
  {
    title: 'Paid plans',
    body: 'Signed-in accounts buy credits. Current prices are on the billing page after you sign in, because they are read from the payment provider rather than written into this site.',
  },
]
