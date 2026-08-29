/**
 * The /faq content, and the source of its FAQPage structured data.
 *
 * Every answer here is one that could be checked against the code rather than
 * remembered, because this page is the version a search result and an
 * assistant will quote — including months after someone changed the thing it
 * describes. So: no adjectives doing work a fact should do, nothing about what
 * the product will do, and no figure a deployment can move without a deploy —
 * the shared pool's size is `COMMUNITY_POOL_SIZE`, and the price lives in
 * Polar, so neither is quoted here. The figures that *are* stated are policy
 * rather than configuration: one generation a day per guest, and fourteen
 * days of retention. Both are confirmed, and both are stated in words.
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
      'No. The canvas at /try runs without one: you can draw, generate and edit as a guest. Downloading what you have made asks for an email address, once, and never asks for an account. That address goes on the launch list and the newsletter.',
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
    question: 'How much can I generate without an account?',
    answer:
      'One generation a day. It is drawn from a pool the whole site shares, so it also depends on the day having room left in it, and the pool refills every day.',
  },
  {
    question: 'How long is my work kept if I do not make an account?',
    answer:
      'Fourteen days. A guest session and the projects made in it are kept that long in the browser you drew in; a guest who never makes an account is forgotten after that. Making an account keeps the work — the project moves across with its history and its share links, so there is nothing to export and re-import.',
  },
  {
    question: 'What does it cost?',
    answer:
      'Generating costs credits, and one credit is one generation: a style guide, a screen, a page in a generated flow, or a revision from the design chat. Drawing, moving, resizing, references and history cost nothing. Current plan prices are on the billing page.',
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
  '[FOUNDER CONFIRM] What does a plan actually cost? No figure exists in this repository — the price lives in Polar, behind POLAR_PRODUCT_ID — so /faq describes the credit model and points at the billing page instead of quoting money. The homepage structured data still carries no `offers` for the same reason: that block is a price Google may print beside the site.',
  '[FOUNDER CONFIRM] Does moving a /try project onto an account require an active plan? Today it does not: `redeemClaim` in convex/guest.ts checks only that the caller is signed in, and a password sign-up made during a guest session converts the user in place, project and all. The FAQ describes what the code does. If a plan is going to be required, that is a change to the mutation before it is a change to this page.',
] as const
