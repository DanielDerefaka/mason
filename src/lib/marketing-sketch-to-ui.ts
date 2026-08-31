/**
 * Intent page for people searching "sketch to UI", "hand-drawn wireframe to
 * design", and the like. The URL is the query. The copy is the product: a
 * labelled sketch, not a prompt, becomes a design.
 */

export const SKETCH_TO_UI_DESCRIPTION =
  'Turn a hand-drawn UI sketch into a finished interface. Label the boxes, add a mood board, and SketchMason builds the screen from the layout you drew.'

export const SKETCH_TO_UI_STEPS: { title: string; body: string }[] = [
  {
    title: 'Draw the layout as boxes',
    body: 'A header rectangle, a hero, a row of cards, a footer. You do not need to draw well. Boxes are enough.',
  },
  {
    title: 'Write a word or two inside them',
    body: 'A wide box at the top could be a nav, a hero image, a banner or a table header. Write "nav" and the guess is gone. Write the real heading and the type size follows.',
  },
  {
    title: 'Drop in a mood board',
    body: 'A few reference images. SketchMason reads them for palette and typographic feel, then binds every colour and face to a role, with contrast checked on the pairings that decide legibility.',
  },
  {
    title: 'Generate beside the sketch',
    body: 'The screen streams onto the canvas next to what you drew. If the hero is wrong you see it before the run finishes. Ask for a change and only what you mentioned moves.',
  },
  {
    title: 'Grow it into a flow',
    body: 'One screen is a mock. The screens around it are the product. Ask for the flow and later pages share the same shell, because they are built from the same system.',
  },
]

export const SKETCH_TO_UI_FAQ: { question: string; answer: string }[] = [
  {
    question: 'Can AI turn a hand-drawn sketch into a UI?',
    answer:
      'Yes. SketchMason takes labelled rectangles on a canvas as the layout and generates a finished interface against a design system read from your mood board. You can try it in the browser without an account.',
  },
  {
    question: 'Do I need a photo of a paper sketch?',
    answer:
      'No. You draw the boxes on the canvas itself. A paper photo is a different product: a scanner. Here the sketch is the spec you keep editing.',
  },
  {
    question: 'What comes out?',
    answer:
      'A design on the canvas you can move, resize and revise. You can export it as a standalone HTML file or as a written brief. Drawing and history cost nothing. Generating costs a credit.',
  },
]
