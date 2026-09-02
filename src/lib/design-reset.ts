import { DESIGN_SCOPE, splitTop } from '@/lib/sanitise'

/**
 * The part of Tailwind's preflight a generated design is drawn under.
 *
 * Everywhere Mason renders a design, the canvas, the editor, the preview and a
 * share link, it sits inside this application's document, which imports
 * Tailwind v4 and so carries preflight: no margin on a heading or a paragraph,
 * no bullet on a list, a button that inherits its font and has no border, an
 * image that is a block. A model's design is written against that whether or
 * not it knows it, because that is what it looked like while it was being
 * edited and approved. The standalone HTML export shipped none of it, so the
 * file regained browser defaults the editor never showed: paragraphs grew 1em
 * margins, a nav list grew bullets and a 40px indent, buttons grew a grey
 * border and the system font, and an `<h1>` that only set its size came back
 * bold.
 *
 * Derived from `node_modules/tailwindcss/preflight.css` (4.3.3) rather than
 * from memory, and `export.test.ts` reads that file to hold this one to it.
 * It keeps what a design would notice and leaves out what exists for elements
 * the sanitiser never lets through (audio, iframe, object, the date-input
 * internals) or for the application's own chrome. The one addition is the
 * border colour: the application's base layer paints every border
 * `var(--border)`, a token every style guide carries, so a design's
 * `border: 1px solid` took its colour from the guide in the editor and has to
 * here too. Every selector is confined beneath the design's wrapper, so the
 * exported page's own body and the credit line under the design are untouched.
 *
 * Layered on purpose. In the application preflight sits in Tailwind's `base`
 * layer and a design's stylesheet is unlayered, which is why a design's own
 * `ul { list-style: disc }` beats it whatever the specificity of either. The
 * same layering here reproduces that cascade exactly, rather than relying on
 * the reset happening to come first in the document. A browser too old for
 * `@layer` drops the block whole and renders the file as it did before.
 *
 * The project export does not use this: its `@import "tailwindcss"` brings the
 * real preflight in, in the real layer.
 */
export const RESET_LAYER = 'mason-reset'

/** Each selector of a list beneath the root. A comma inside `:where()` is not a separator. */
const beneath = (root: string, selectors: string) =>
  splitTop(selectors, ',')
    .map((selector) => `${root} ${selector.trim()}`)
    .join(', ')

export const designResetCss = (scope: string = DESIGN_SCOPE): string => {
  const root = `.${scope}`
  const under = (selectors: string) => beneath(root, selectors)

  const rules: [selectors: string, declarations: string][] = [
    // What preflight puts on `html`, which the design inherited from it.
    [root, 'line-height: 1.5; -webkit-text-size-adjust: 100%; tab-size: 4'],
    [
      `${root}, ${under('*, ::before, ::after')}`,
      'box-sizing: border-box; margin: 0; padding: 0; border: 0 solid var(--border, currentColor)',
    ],
    [under('hr'), 'height: 0; color: inherit; border-top-width: 1px'],
    [under('h1, h2, h3, h4, h5, h6'), 'font-size: inherit; font-weight: inherit'],
    [under('a'), 'color: inherit; -webkit-text-decoration: inherit; text-decoration: inherit'],
    [under('b, strong'), 'font-weight: bolder'],
    [
      under('code, kbd, pre'),
      "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 1em",
    ],
    [under('small'), 'font-size: 80%'],
    [under('sub, sup'), 'font-size: 75%; line-height: 0; position: relative; vertical-align: baseline'],
    [under('sub'), 'bottom: -0.25em'],
    [under('sup'), 'top: -0.5em'],
    [under('table'), 'text-indent: 0; border-color: inherit; border-collapse: collapse'],
    [under('summary'), 'display: list-item'],
    [under('ol, ul'), 'list-style: none'],
    [under('img, svg'), 'display: block; vertical-align: middle'],
    [under('img'), 'max-width: 100%; height: auto'],
    [
      under('button, input, select, optgroup, textarea'),
      'font: inherit; font-feature-settings: inherit; font-variation-settings: inherit; letter-spacing: inherit; color: inherit; border-radius: 0; background-color: transparent; opacity: 1',
    ],
    [under('::placeholder'), 'opacity: 1'],
    [under('textarea'), 'resize: vertical'],
    [under("button, input:where([type='button'], [type='reset'], [type='submit'])"), 'appearance: button'],
  ]

  const lines = rules.map(([selectors, declarations]) => `  ${selectors} { ${declarations}; }`)

  return [
    `@layer ${RESET_LAYER} {`,
    ...lines,
    // Guarded as preflight guards it: old Safari crashed on color-mix with
    // currentcolor, and the placeholder is not worth a crash.
    '  @supports (not (-webkit-appearance: -apple-pay-button)) or (contain-intrinsic-size: 1px) {',
    `    ${under('::placeholder')} { color: color-mix(in oklab, currentcolor 50%, transparent); }`,
    '  }',
    '}',
  ].join('\n')
}
