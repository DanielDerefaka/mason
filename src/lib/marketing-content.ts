import type { ApproachStep, FaqItem, ServiceCard } from '@/types/marketing-content'

/* ------------------------------------------------------------------ *
 * Imagery
 *
 * One image: the hero capture. Everything else is drawn in CSS by
 * `components/marketing/screen-mocks.tsx`. The layout this was ported from
 * carries a studio's own photography — which is theirs — and filling those
 * slots with app screenshots read worse than drawing them. The hero is the
 * exception because it is the one place a real capture proves something a
 * drawing cannot.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

export const HERO = {
  eyebrow: 'Sketch a screen. Build a design system. Ship the interface.',
  /**
   * Three runs — grey, white, grey — and short enough to sit on one line at
   * a 1320px measure. Everything after the lead used to wrap to three lines,
   * which pushed the capture below the fold and lost the reference's shape:
   * one statement, then the product.
   */
  headline: {
    lead: 'Rough rectangles in,',
    emphasis: 'finished interfaces',
    tail: 'out.',
  },
  /**
   * Six lines in two columns of three. Each must fit one line at the
   * column width (about fifty characters), or the columns stop lining up.
   */
  checklist: [
    { lead: 'Sketch the layout', rest: ', boxes and a label or two' },
    { lead: 'Mood board in', rest: ', design system out' },
    { lead: 'Streams onto the canvas', rest: ', beside your sketch' },
    { lead: 'Revise by asking', rest: ', only what you mention moves' },
    { lead: 'Grow it into a flow', rest: ', screen by screen' },
    { lead: 'Autosaved, every stroke', rest: ', with the history yours' },
  ],
  /**
   * The two calls to action, and which is which.
   *
   * The canvas leads. The homepage had no link to /try at all — every "start"
   * on the page went to the sign-up form, so the one thing a visitor can do
   * without an account was the one thing the site never offered them. Making
   * an account is still here, second, for the people who already know they
   * want one.
   */
  cta: {
    primary: { label: 'Try it free — no sign-up', href: '/try' },
    secondary: { label: 'Create an account' },
  },
  // There was a third link under the checklist — "Also on the desktop ·
  // Download for Mac" — pulled with /download while the Mac build is not
  // notarised. It comes back with the page: see the commit that removed both.
  image: {
    src: '/images/hero-canvas.webp',
    alt: 'The SketchMason canvas: an inspiration board holding a reference image, an empty frame, and beside them a full landing page generated from them.',
  },
}

/* ------------------------------------------------------------------ *
 * Introduction
 * ------------------------------------------------------------------ */

export const INTRODUCTION = {
  eyebrow: 'Why sketches',
  /** Read as one paragraph; the manifesto brightens it word by word on scroll. */
  statement:
    'Sketches, not prompts. Systems, not screenshots. SketchMason reads the shape you drew and builds the screen it implies, using a design system taken from your own mood board — so the fifth screen still looks like the first, and the flow around it looks like both.',
  primaryCta: { label: 'About us', href: '/about-us' },
  secondaryCta: { label: 'Read the blog', href: '/blog' },
}

/* ------------------------------------------------------------------ *
 * Capabilities
 * ------------------------------------------------------------------ */

export const SERVICES_INTRO = {
  eyebrow: 'Everything in the box',
  /** Two runs: the lead sits grey, the emphasis sits white. */
  headline: { lead: 'Everything between', emphasis: 'a box and a build.' },
  body: 'One canvas, one design system, and every step from the first rectangle to the last screen of the flow.',
  primaryCta: { label: 'Start free', href: '/auth/sign-up' },
  secondaryCta: { label: 'Read the blog', href: '/blog' },
}

export const SERVICES: ServiceCard[] = [
  {
    title: 'Infinite canvas',
    description: 'Sketches, references and generated screens side by side, with room to spread out.',
    icon: 'globe',
  },
  {
    title: 'Mood board style guides',
    description: 'Drop in the images that carry the feeling and get a design system written from them.',
    icon: 'edit',
  },
  {
    title: 'Sketch to interface',
    description: 'A labelled rectangle is an instruction. The screen it implies gets built.',
    icon: 'cart',
  },
  {
    title: 'Streamed generation',
    description: 'The interface arrives on the canvas as it is made, so a wrong turn shows in seconds.',
    icon: 'bars',
  },
  {
    title: 'Inspiration references',
    description: 'Up to six images per project steer palette, density and type — never copied in.',
    icon: 'plane',
  },
  {
    title: 'Consistent design tokens',
    description: 'Every colour, face and radius is bound to a role, so the fifth screen matches the first.',
    icon: 'puzzle',
  },
  {
    title: 'Design chat & revisions',
    description: 'Say what should change on any screen. Only what you asked about moves.',
    icon: 'bolt',
  },
  {
    title: 'Flow generation',
    description: 'Ask for the flow and get the screens a user would actually reach next.',
    icon: 'navigation',
  },
  {
    title: 'Contrast-checked palettes',
    description: 'The pairings that decide legibility are checked before they reach the canvas.',
    icon: 'rocket',
  },
  {
    title: 'Autosave & full history',
    description: 'Every stroke is kept and a drag is one undo step, not fifty.',
    icon: 'tools',
  },
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
    title: 'Mood board first',
    headline: ['Start from the images you love,', 'not a blank palette.'],
    body: [
      { text: 'Drop in the images that carry the feeling you want. We read them for ' },
      { text: 'palette, contrast and type', bold: true },
      { text: ', then write a design system you can actually build against.' },
    ],
    visual: 'marquee',
  },
  {
    title: 'Sketch the screen',
    headline: ['Draw the structure,', 'skip the pixels.'],
    body: [
      { text: 'Rectangles, circles and a few labels. The sketch decides ' },
      { text: 'layout and reading order', bold: true },
      { text: ' — you are describing structure, not drawing pixels.' },
    ],
    visual: 'phones',
  },
  {
    title: 'Watch it build',
    headline: ['See the screen arrive', 'while it is still being made.'],
    body: [
      { text: 'The interface streams onto the canvas beside your sketch, so if the layout is going the wrong way you know ' },
      { text: 'within seconds', bold: true },
      { text: ', not after the full minute.' },
    ],
    visual: 'dashboard',
  },
  {
    title: 'Revise by asking',
    headline: ['Change one thing', 'without losing the rest.'],
    body: [
      { text: 'Open the chat on any screen and say what you want changed. Only ' },
      { text: 'what you asked about', bold: true },
      { text: ' moves; everything else comes back exactly as it was.' },
    ],
    visual: 'editor',
  },
  {
    title: 'Grow it into a flow',
    headline: ['One screen is a mock.', 'A flow is a product.'],
    body: [
      { text: 'One screen is a mock. Ask for the flow and you get the screens a user would ' },
      { text: 'actually reach next', bold: true },
      { text: ', all sharing the same shell and palette.' },
    ],
    visual: 'cms-table',
  },
  {
    title: 'Nothing to lose',
    headline: ['Every stroke kept,', 'every step reversible.'],
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
 * Case in point
 *
 * The two generated captures are the only place the site shows output
 * rather than describing it, so they get a section of their own.
 * ------------------------------------------------------------------ */

export const CASE_IN_POINT = {
  eyebrow: 'Case in point',
  headline: { lead: 'Six rectangles in.', emphasis: 'A landing page out.' },
  body: 'A header box, a hero box with two smaller boxes inside it, a row of three cards and a footer. That was the whole sketch. The page on the right is what came back, built from a design system read off two reference images.',
  points: [
    { lead: 'Layout from the sketch', rest: ' — reading order and hierarchy exactly as drawn.' },
    { lead: 'Palette from the board', rest: ' — colour and type taken from the references.' },
    { lead: 'Ready to grow', rest: ' — every later screen shares the same shell.' },
  ],
  cta: { label: 'Try it on your own sketch', href: '/auth/sign-up' },
  images: {
    page: {
      src: '/images/generated-page.webp',
      alt: 'A full landing page generated by SketchMason from a rectangle sketch.',
      width: 1300,
      height: 820,
    },
    detail: {
      src: '/images/generated-detail.webp',
      alt: 'A close crop of the generated landing page showing its card row.',
      width: 1300,
      height: 600,
    },
  },
}

/* ------------------------------------------------------------------ *
 * Credits
 *
 * What a credit buys, stated as rows rather than a price list; plan prices
 * live in the app, where they are read from the billing config.
 * ------------------------------------------------------------------ */

export const CREDITS = {
  eyebrow: 'Credits',
  headline: { lead: 'Pay for generations.', emphasis: 'Everything else is free.' },
  quote: 'A credit is one generation — a style guide, a screen, a page in a flow, or a revision from the chat. Drawing, moving, resizing and everything else on the canvas costs nothing.',
  rows: [
    { label: 'Style guide from a mood board', value: '1 credit' },
    { label: 'Screen from a sketch', value: '1 credit' },
    { label: 'Each page in a generated flow', value: '1 credit' },
    { label: 'Revision from the design chat', value: '1 credit' },
    { label: 'Canvas, references, history', value: 'Free' },
  ],
  cta: { label: 'Start free', href: '/auth/sign-up' },
}

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
  headline: { lead: 'Draw the shape.', emphasis: 'Get the product.' },
  body: 'Free to start. The first style guide and screen are on us.',
  // The canvas, not a sign-up form, and not conditionally: /try is public with
  // or without the free week, and this pill closes every marketing page. It
  // said "Start free" and went to /auth/sign-up whenever FREE_WEEK was unset,
  // which contradicted the header pill on the same page and the answer on /faq
  // that says no account is needed. The full promise is made here — unlike the
  // header's shortened "Try it free", this pill has a row to itself.
  primaryCta: { label: 'Try it free — no sign-up', href: '/try' },
}
