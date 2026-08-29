/**
 * The /faq content, and the source of its FAQPage structured data.
 *
 * Every answer here is one that could be checked against the code rather than
 * remembered, because this page is the version a search result and an
 * assistant will quote — including months after someone changed the thing it
 * describes. So: no numbers that a pool size or a price can move, no adjectives
 * doing work a fact should do, and nothing about what the product will do.
 *
 * Where a claim could not be verified, it is not written softly — it is not
 * written at all, and the open question is listed in `PENDING_CONFIRMATION`
 * below. A hedge on a public page is still a claim; an omission is not.
 */
export interface FaqEntry {
  question: string
  /** Plain sentences. This is read aloud by machines as often as by people. */
  answer: string
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: 'What is Mason?',
    answer:
      'Mason turns a hand-drawn interface sketch into working code. You draw a rough frame on a canvas, describe what belongs inside it, and Mason generates the interface and the code behind it.',
  },
  {
    question: 'How does the sketch become code?',
    answer:
      'You block out a screen with rectangles on an infinite canvas and label them. A labelled rectangle is an instruction, so the labels are what the layout is generated from. Mason builds the screen against a design system, and the code for it comes out with the design.',
  },
  {
    question: 'Do I need to draw well?',
    answer:
      'No. Boxes are enough. Writing a word or two inside them helps a great deal, though — a labelled rectangle is an instruction, an unlabelled one is a guess.',
  },
  {
    question: 'Do I need an account to try it?',
    answer:
      'No. The canvas at /try runs without one: you can draw, generate and edit as a guest. Downloading what you have made asks for an email address, once, and never asks for an account.',
  },
  {
    question: 'Where does the design system come from?',
    answer:
      'A mood board. Mason reads the images for palette and typographic feel, then produces design tokens bound to roles, with contrast checked on the pairings that decide legibility. Every screen generated afterwards is built from the same system, so they match.',
  },
  {
    question: 'Can I use my own Anthropic API key?',
    answer:
      'Yes. A key you paste into the canvas is held in the browser tab only, sent with the generation request, and gone when the tab closes. Mason never stores it.',
  },
  {
    question: 'Does it design for mobile?',
    answer:
      'Yes. From a generated screen you can produce a mobile version of it, designed at phone width and placed beside the original on the canvas.',
  },
  {
    question: 'What can I export?',
    answer:
      'Three things: the design as a standalone HTML file, a written brief describing it, or a Next.js project you can install and run. The export is taken from the design as it stands on screen, so edits made after generating are included.',
  },
]

/**
 * Open questions — deliberately not answered on the page.
 *
 * Each of these is a question a visitor genuinely asks and that the code does
 * not settle. Guessing at one produces a sentence that reads as authoritative,
 * gets quoted, and is then wrong somewhere nobody is looking. They stay off
 * /faq until a person confirms the answer.
 *
 * `src/app/metadata.test.ts` asserts none of these strings reach the rendered
 * page or the structured data.
 */
export const PENDING_CONFIRMATION = [
  '[FOUNDER CONFIRM] What does Mason cost, and what does the free tier include? Deliberately absent from /faq and from the homepage structured data — an offer in JSON-LD is a price Google may print beside the site.',
  '[FOUNDER CONFIRM] How long is a guest canvas kept, and does it survive closing the tab or clearing site data? The FAQ says a guest can draw and generate, and stops short of promising the work persists.',
  '[FOUNDER CONFIRM] What is the email address collected at download used for, besides sending the download? If it is ever used for anything else, the answer to "Do I need an account to try it?" needs a sentence saying so.',
  '[FOUNDER CONFIRM] How much can a guest generate on /try before running out, and what does the shared daily allowance reset to? Left unstated on purpose — it is a number the pool can change and a crawler will keep quoting.',
] as const
