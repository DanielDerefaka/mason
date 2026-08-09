import type { ApproachStep, FaqItem, ServiceCard } from '@/types/marketing-content'

/* ------------------------------------------------------------------ *
 * Imagery
 *
 * There is none. Every visual on the marketing site is drawn in CSS by
 * `components/marketing/screen-mocks.tsx`. The layout this was ported from
 * carries a studio's own photography — which is theirs — and filling those
 * slots with the same four app screenshots read worse than drawing them.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

export const HERO = {
  eyebrow: 'Sketch In. Product Out.',
  /** Runs alternate between the display sans and the Fraunces italic. */
  headline: [
    { text: 'Draw', italic: false },
    { text: 'Rectangles', italic: true },
    { text: 'Ship', italic: true },
    { text: 'Interfaces', italic: false },
  ],
  subhead: 'Finished screens from the roughest sketch you can draw.',
  primaryCta: { label: 'Start free', href: '/auth/sign-up' },
  secondaryCta: { label: 'See how it works', href: '/#approach' },
}

/* ------------------------------------------------------------------ *
 * Introduction
 * ------------------------------------------------------------------ */

export const INTRODUCTION = {
  headline: ['Sketches, not prompts.', 'Systems, not screenshots.'],
  body: 'Mason reads the shape you drew and builds the screen it implies — using a design system derived from your own mood board, so the fifth screen still looks like the first.',
  primaryCta: { label: 'About us', href: '/about-us' },
  secondaryCta: { label: 'Read the blog', href: '/blog' },
}

/* ------------------------------------------------------------------ *
 * Capabilities
 * ------------------------------------------------------------------ */

export const SERVICES_INTRO = {
  headline: ['Everything between', 'a box and a build.'],
  primaryCta: { label: 'Start free', href: '/auth/sign-up' },
  secondaryCta: { label: 'Read the blog', href: '/blog' },
}

export const SERVICES: ServiceCard[] = [
  { lines: ['Infinite', 'Canvas'], icon: 'globe' },
  { lines: ['Mood Board', 'Style Guides'], icon: 'edit' },
  { lines: ['Sketch to', 'Interface'], icon: 'cart' },
  { lines: ['Streamed', 'Generation'], icon: 'bars' },
  { lines: ['Inspiration', 'References'], icon: 'plane' },
  { lines: ['Consistent', 'Design Tokens'], icon: 'puzzle' },
  { lines: ['Design Chat', '& Revisions'], icon: 'bolt' },
  { lines: ['Flow', 'Generation'], icon: 'navigation' },
  { lines: ['Contrast', 'Checked Palettes'], icon: 'rocket' },
  { lines: ['Autosave &', 'Full History'], icon: 'tools' },
]

/* ------------------------------------------------------------------ *
 * Marquee strip
 * ------------------------------------------------------------------ */

export const MARQUEE_ITEMS = [
  'Sketch to Interface',
  'Design Systems',
  'Streamed Generation',
  'Flows, Planned From Your Design',
]

/* ------------------------------------------------------------------ *
 * How it works
 * ------------------------------------------------------------------ */

export const APPROACH: ApproachStep[] = [
  {
    title: 'Mood Board First',
    body: [
      { text: 'Drop in the images that carry the feeling you want. We read them for ' },
      { text: 'palette, contrast and type', bold: true },
      { text: ', then write a design system you can actually build against.' },
    ],
    visual: 'marquee',
  },
  {
    title: 'Sketch The Screen',
    body: [
      { text: 'Rectangles, circles and a few labels. The sketch decides ' },
      { text: 'layout and reading order', bold: true },
      { text: ' — you are describing structure, not drawing pixels.' },
    ],
    visual: 'phones',
  },
  {
    title: 'Watch It Build',
    body: [
      { text: 'The interface streams onto the canvas beside your sketch, so if the layout is going the wrong way you know ' },
      { text: 'within seconds', bold: true },
      { text: ', not after the full minute.' },
    ],
    visual: 'dashboard',
  },
  {
    title: 'Revise By Asking',
    body: [
      { text: 'Open the chat on any screen and say what you want changed. Only ' },
      { text: 'what you asked about', bold: true },
      { text: ' moves; everything else comes back exactly as it was.' },
    ],
    visual: 'editor',
  },
  {
    title: 'Grow It Into A Flow',
    body: [
      { text: 'One screen is a mock. Ask for the flow and you get the screens a user would ' },
      { text: 'actually reach next', bold: true },
      { text: ', all sharing the same shell and palette.' },
    ],
    visual: 'cms-table',
  },
  {
    title: 'Nothing To Lose',
    body: [
      { text: 'Every stroke autosaves and the whole history is yours — a drag is ' },
      { text: 'one undo step', bold: true },
      { text: ', not fifty.' },
    ],
    visual: 'clock',
  },
]

/** Rows that scroll inside the flow-generation table mock. */
export const CMS_ROWS = [
  { title: 'Pricing — plans and comparison', date: '58s' },
  { title: 'Checkout — payment step', date: '61s' },
  { title: 'Confirmation — order received', date: '47s' },
  { title: 'Dashboard — account overview', date: '66s' },
  { title: 'Settings — billing and team', date: '52s' },
  { title: 'Empty state — no projects yet', date: '39s' },
  { title: 'All handoffs — review queue', date: '71s' },
]

/* ------------------------------------------------------------------ *
 * FAQs + CTA
 * ------------------------------------------------------------------ */

export const FAQS: FaqItem[] = [
  {
    question: '1. Do I need to be able to draw?',
    answer:
      'No. Boxes are enough. Writing a word or two inside them helps a great deal though — a labelled rectangle is an instruction, an unlabelled one is a guess.',
  },
  {
    question: '2. What counts as a credit?',
    answer:
      'One generation. A style guide, a screen, a page in a flow, or a revision from the chat is one credit each. Drawing, moving, resizing and everything else on the canvas is free.',
  },
  {
    question: '3. Where does the design system come from?',
    answer:
      'Your mood board. We read the images for palette and typographic feel, then produce every design token bound to a role, with contrast checked on the pairings that decide legibility.',
  },
  {
    question: '4. Can I use my own reference images?',
    answer:
      'Yes, up to six per project. They steer palette, density and type personality. They are never copied into the design itself — your sketch still decides the layout.',
  },
  {
    question: '5. What comes out at the end?',
    answer:
      'A design on the canvas you can move, resize, revise and grow into a flow. It is built from your own design system, so every screen you generate afterwards still matches.',
  },
]

export const CTA = {
  headline: ['Draw The Shape.', 'Get The Product.'],
  secondaryCta: { label: 'Read the blog', href: '/blog' },
  primaryCta: { label: 'Start free', href: '/auth/sign-up' },
}
