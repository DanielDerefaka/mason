/**
 * /compare: how SketchMason differs from the tools people already search for.
 *
 * Factual, and only claims this product can be checked against. Competitors
 * move; the sentences below describe the usual job each tool is known for,
 * not a version number.
 */

export const COMPARE_DESCRIPTION =
  'SketchMason turns labelled boxes on a canvas into a UI design. How that differs from Uizard, Google Stitch and v0.'

export const COMPARE_LEAD =
  'Most AI design tools start from a paragraph. SketchMason starts from the boxes you drew. The sketch is the spec. The mood board is the system. The export is a design, as HTML or as a written brief.'

export type CompareRow = {
  tool: string
  startsFrom: string
  youGet: string
  fit: string
}

export const COMPARE_ROWS: CompareRow[] = [
  {
    tool: 'SketchMason',
    startsFrom: 'Labelled rectangles on an infinite canvas, plus a mood board',
    youGet: 'A finished screen on the same canvas, then a flow or a mobile version. Export as HTML or a brief.',
    fit: 'You already know the layout. You want the fifth screen to match the first.',
  },
  {
    tool: 'Uizard',
    startsFrom: 'A photo of a paper sketch, a screenshot, or a text prompt',
    youGet: 'An editable wireframe or mid-fidelity mock, with templates and collaboration',
    fit: 'You want a scan of a napkin or a screenshot turned into a board you can click around.',
  },
  {
    tool: 'Google Stitch',
    startsFrom: 'A text prompt, sometimes with a reference image',
    youGet: 'A high-fidelity UI and a path into Figma',
    fit: 'You want a polished screen from a description, and you live in Figma.',
  },
  {
    tool: 'v0',
    startsFrom: 'A prompt describing an app',
    youGet: 'A running interface, closer to an app than to a design file',
    fit: 'You want something that executes, not a design to review.',
  },
]

export const COMPARE_FAQ: { question: string; answer: string }[] = [
  {
    question: 'Is SketchMason a Uizard alternative?',
    answer:
      'If you sketch on paper and want a wireframe of that photo, Uizard is built for the scan. If you block out a screen as labelled boxes and want a finished UI against your own design system, that is SketchMason.',
  },
  {
    question: 'Is SketchMason a v0 alternative?',
    answer:
      'No. v0 starts from a prompt and aims at a running app. SketchMason starts from a sketch and aims at a design you can export as HTML or as a brief. They solve different jobs.',
  },
  {
    question: 'Do I need to prompt well?',
    answer:
      'You need to label the boxes. Write "nav", "hero image, full bleed", or the real copy of a button. An unlabelled rectangle is a guess. A labelled one is an instruction.',
  },
]
