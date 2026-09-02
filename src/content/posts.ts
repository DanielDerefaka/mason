export type Post = {
  slug: string
  title: string
  /**
   * The `<title>` when the H1 is too long to survive the " | SketchMason"
   * suffix inside 60 characters. The heading on the page keeps the long form,
   * which is the one worth reading; this is the one a result has room for.
   */
  seoTitle?: string
  excerpt: string
  date: string
  /** When the page last changed in a way a crawler should recrawl. */
  updated?: string
  tag: string
  cover: string
  coverAlt: string
  /** Paragraphs and headings. A heading is any line starting with "## ". */
  body: string[]
  /** Optional Q and A, marked up as FAQPage on the post. */
  faq?: { question: string; answer: string }[]
}

/**
 * Blog content.
 *
 * Kept as data rather than MDX: the posts are short, they need no components,
 * and a typed array means a broken link or a missing field is a build error
 * instead of a page that renders blank.
 */
export const POSTS: Post[] = [
  {
    slug: 'how-a-labelled-sketch-becomes-a-ui',
    title: 'How a labelled sketch becomes a UI',
    excerpt:
      'You do not prompt a layout into existence. You draw the boxes, write what they are, and the screen is generated from that.',
    date: '2026-09-01',
    tag: 'Craft',
    cover: '/images/blog/sketch-to-ui.webp',
    coverAlt:
      'A chalkboard UI sketch of labelled boxes on the left, the same layout as a finished interface on the right.',
    body: [
      'People searching for a sketch-to-UI tool usually mean one of two jobs. Scan a photo of a napkin into a wireframe. Or take a layout you already understand and get a finished screen out of it. SketchMason is the second.',
      '## The sketch is the spec',
      'A prompt describes a product in the abstract. A labelled sketch describes this screen: a nav the width of the frame, a hero with a full-bleed image, three cards, a footer. The model does not have to invent the reading order. You already drew it.',
      'Boxes are enough. You do not need to draw well. An unlabelled rectangle is still a guess, the same guess every average landing page is made of. Write "nav" or "hero image, full bleed" or the real copy of a button, and the guess is gone.',
      '## The mood board is the system',
      'Layout without a system is a one-off. Drop in a few reference images. SketchMason reads them for palette and typographic feel, then binds every colour and face to a role, with contrast checked on the pairings that decide whether text can be read. The fifth screen is built from the same tokens as the first.',
      '## What comes out',
      'A design on the canvas, beside the sketch, streamed as it is made. You can revise it, grow it into a flow, or make a mobile version. Export is a standalone HTML file or a written brief. Drawing, moving and history cost nothing. Generating costs a credit.',
      '## Try it on an ugly sketch',
      'Pretty sketches are not the point. Six rectangles and a handful of labels are. The [canvas at /try](/try) runs without an account. If you want the comparison with Uizard, Stitch and prompt-to-app tools, that is [/compare](/compare).',
    ],
    faq: [
      {
        question: 'Can AI turn a hand-drawn sketch into a UI?',
        answer:
          'Yes. SketchMason takes labelled rectangles on a canvas as the layout and generates a finished interface against a design system from your mood board.',
      },
      {
        question: 'Do I need an account to try it?',
        answer:
          'No. The canvas at /try runs without one. Downloading asks for an email once.',
      },
    ],
  },
  {
    slug: 'how-to-label-a-ui-sketch',
    title: 'How to label a UI sketch so the model stops guessing',
    seoTitle: 'How to label a UI sketch',
    excerpt:
      'Write the component type, a piece of real copy, or a size constraint. Those three labels do more than a longer prompt.',
    date: '2026-09-01',
    tag: 'Craft',
    cover: '/images/blog/how-to-label.webp',
    coverAlt:
      'A close crop of a dark UI wireframe with handwritten labels inside the boxes: nav, hero, pricing, CTA.',
    body: [
      'A labelled rectangle is an instruction. An unlabelled one is a guess. That is the whole method, and it is the largest single improvement we have measured on a generated screen.',
      '## Name the region, not the pixels',
      'You do not need to annotate every element. You need to remove the guesses that would change the layout. A wide box at the top of a frame could be a navigation bar, a hero image, a banner or a table header. Write "nav" and three of those options disappear.',
      '## Three kinds of label that pay off',
      'Component type: nav, hero, sidebar, card row, footer, empty state. The model has seen all of these. The label picks which one.',
      'Real copy: the heading you actually want, the button that says "Start free", the price you intend to charge. Placeholder latin is a request for generic marketing.',
      'A constraint on size: "full bleed", "sticky", "one column on mobile". These are cheap to write and expensive to reverse after the screen exists.',
      '## What not to label',
      'Padding, exact hex values, font files. Those belong on the mood board and the design system, not in the sketch. The sketch decides hierarchy. The board decides feel.',
      '## Fifteen seconds',
      'A frame with six words written in it consistently produces a more intentional design than the same frame with none. Try it on [/try](/try), or read [how a labelled sketch becomes a UI](/blog/how-a-labelled-sketch-becomes-a-ui).',
    ],
    faq: [
      {
        question: 'Do I need to draw well?',
        answer:
          'No. Boxes are enough. Writing a word or two inside them is what changes the result.',
      },
      {
        question: 'What should I write in a box?',
        answer:
          'A component type, a piece of real copy, or a size constraint. Those three remove the guesses that would change the layout.',
      },
    ],
  },
  {
    slug: 'mood-board-to-design-system',
    title: 'A mood board is how the fifth screen matches the first',
    seoTitle: 'Mood board to design system',
    excerpt:
      'A palette of eight nice colours is a mood. A palette where each colour is bound to a role is a system.',
    date: '2026-09-01',
    tag: 'Design systems',
    cover: '/images/blog/mood-board.webp',
    coverAlt:
      'A physical mood board on a dark desk: reference photographs pinned beside colour tokens and type samples.',
    body: [
      'Generating a palette is easy. Generating a palette that stays readable at every pairing is the actual work. SketchMason reads a mood board for that work, then writes tokens bound to roles rather than a list of pretty swatches.',
      '## What the board is for',
      'Up to six reference images per project. They steer palette, density and type personality. They are never copied into the design itself. Your sketch still decides the layout.',
      '## Roles, not colours',
      'Surface, border, focus ring, destructive, muted text. A component asks for the role. Swap the values behind the roles and every screen follows. That indirection is what lets a flow survive a change of theme.',
      '## Contrast is a constraint',
      'Body text needs a contrast ratio of at least 4.5 to 1 on the surface it sits on. Large text can go to 3 to 1. A generated guide that fails a pairing is a generated guide we can catch before anyone builds on it.',
      '## Where the taste goes',
      'Warm rather than cool, dense rather than airy, serif rather than grotesque: that is still a designer\'s job. The constraints exist so the judgement is the only thing left to make. Drop the board in on /try and generate the style guide first, then the screen.',
    ],
    faq: [
      {
        question: 'Where does the design system come from?',
        answer:
          'A mood board. SketchMason reads the images for palette and typographic feel, then produces design tokens bound to roles, with contrast checked on the pairings that decide legibility.',
      },
      {
        question: 'Are my reference images copied into the design?',
        answer:
          'No. They steer palette, density and type. The sketch still decides the layout.',
      },
    ],
  },
  {
    slug: 'sketchmason-and-uizard',
    title: 'Uizard scans a sketch. SketchMason uses one as a spec.',
    seoTitle: 'SketchMason and Uizard compared',
    excerpt:
      'If you photograph a napkin, you want a scanner. If you already know the layout, you want the boxes to be the spec.',
    date: '2026-09-01',
    tag: 'Product',
    cover: '/images/blog/uizard-jobs.webp',
    coverAlt:
      'Two canvases on a desk: a crumpled paper napkin sketch on the left, a digital board of labelled rectangles on the right.',
    body: [
      'Uizard is good at a job SketchMason does not do: take a photo of a paper sketch or a screenshot and turn it into an editable board. SketchMason is good at a job Uizard is not built for: you draw the layout as labelled boxes, a mood board sets the system, and the screen is generated beside the sketch.',
      '## Different inputs',
      'A napkin photo is a picture of an idea. A labelled canvas is the idea, still editable. If you need to digitise someone else\'s drawing, scan it. If you are the person drawing, draw on the canvas.',
      '## Different outputs',
      'Uizard aims at a wireframe or mid-fidelity mock you click around. Google Stitch aims at a polished screen you take into Figma. v0 aims at a running app. SketchMason aims at a finished design on an infinite canvas, exported as HTML or as a written brief.',
      '## When to use which',
      'Scan a client\'s paper: Uizard. Prompt a screen from a paragraph: Stitch. Want something that executes: v0. Know the layout and want the fifth screen to match the first: SketchMason. The [comparison table is on /compare](/compare). The [canvas is on /try](/try).',
    ],
    faq: [
      {
        question: 'Is SketchMason a Uizard alternative?',
        answer:
          'If you sketch on paper and want a wireframe of that photo, Uizard is built for the scan. If you block out a screen as labelled boxes and want a finished UI against your own design system, that is SketchMason.',
      },
      {
        question: 'Is SketchMason a v0 alternative?',
        answer:
          'No. v0 starts from a prompt and aims at a running app. SketchMason starts from a sketch and aims at a design you can export as HTML or as a brief.',
      },
    ],
  },
  {
    slug: 'what-you-export-from-a-sketch',
    title: 'What you take away is a design, not a running app',
    seoTitle: 'What you export from a sketch',
    excerpt:
      'Export is a standalone HTML file or a written brief. Drawing is free. Generating costs a credit.',
    date: '2026-09-01',
    tag: 'Product',
    cover: '/images/blog/html-export.webp',
    coverAlt:
      'A laptop on a dark desk showing a finished landing page in a browser, with an HTML file beside it.',
    body: [
      'SketchMason is a design tool with an HTML export. Copy that says otherwise describes a different product. What you take off the canvas is the design as it stands, including edits you made after generating.',
      '## HTML',
      'A standalone file. Open it in a browser. Hand it to a developer as a picture of the screen that actually has structure, not a PNG.',
      '## A written brief',
      'The layout, the tokens, the decisions. Useful when the next step is a conversation rather than a file.',
      '## What it is not',
      'It is not a running application and it is not a Figma file. If you need those, a different tool is the honest choice. The FAQ names the third export, there and only there.',
      '## What it costs',
      'A credit is one generation: a style guide, a screen, a page in a flow, or a revision from the chat. Drawing, moving, resizing, references and history cost nothing. How to start without an account is on [/pricing](/pricing). The [canvas is on /try](/try).',
    ],
    faq: [
      {
        question: 'What can I export?',
        answer:
          'The design exports as a standalone HTML file or a written brief. Edits made after generating are included.',
      },
      {
        question: 'What does it cost?',
        answer:
          'Generating costs credits. Drawing, moving, resizing, references and history cost nothing. Guests can try the canvas without an account.',
      },
    ],
  },
  {
    slug: 'why-your-sketch-matters-more-than-your-prompt',
    title: 'Your sketch matters more than your prompt',
    excerpt:
      'The fastest way to improve a generated design is not a better model. It is three words written inside a box.',
    date: '2026-08-04',
    updated: '2026-09-01',
    tag: 'Craft',
    cover: '/images/blog/labelled-boxes.webp',
    coverAlt:
      'A dark dotted sheet with a UI wireframe drawn as labelled boxes: nav, hero, cards and footer.',
    body: [
      'Everyone reaches for the prompt first. It is the visible knob, so it feels like the one that matters. In practice the largest single improvement we have measured came from something much duller: labelling the boxes in the sketch.',
      '## An unlabelled box is ambiguous',
      'A wide rectangle at the top of a frame could be a navigation bar, a hero image, a banner, or a table header. A model looking at it has to guess, and it guesses from the average of everything it has seen. That average is what people mean when they say a design "looks AI generated".',
      'Write "nav" inside that rectangle and the ambiguity disappears. Write "hero image, full bleed" and you have specified the crop as well. The sketch stops being a shape and becomes an instruction.',
      '## What to label',
      'Regions, not pixels. You do not need to annotate every element. You need to remove the guesses that would change the layout. In our own tests the labels that paid off most were the ones naming a component type, a piece of real copy, or a constraint on size.',
      'A frame with six words written in it consistently produces a more intentional design than the same frame with none. It costs about fifteen seconds.',
      '## The model is not the bottleneck',
      'We ran the same sketch and the same reference through two different frontier models. The better one produced roughly twice the markup and filled in every value; the weaker one left statistics blank and picked an unrelated photograph. That is a real difference, and it is still smaller than the difference between a labelled sketch and an unlabelled one.',
      'Fix the input first. It is free.',
    ],
  },
  {
    slug: 'design-systems-are-just-constraints',
    title: 'A design system is just a set of constraints',
    excerpt:
      'Generating a palette is easy. Generating a palette that stays readable at every pairing is the actual work.',
    date: '2026-07-28',
    updated: '2026-09-01',
    tag: 'Design systems',
    cover: '/images/blog/design-tokens.webp',
    coverAlt:
      'A paper design-system board: colour swatches bound to roles, type specimens and a contrast check.',
    body: [
      'Ask a model for a colour palette and you will get one. It will be pleasant, it will photograph well, and roughly a third of the time some of its text will be illegible on its own background.',
      '## Contrast is a constraint, not a preference',
      'Every foreground token has to be readable on the surface it sits on. Body text needs a contrast ratio of at least 4.5 to 1; large text can go to 3 to 1. These are not stylistic opinions, they are the difference between a design that ships and one that fails an audit.',
      'So we ask for it explicitly, and we check it. A generated guide that fails a pairing is a generated guide we can catch before anyone builds on it.',
      '## Naming is half the system',
      'A palette of eight nice colours is a mood board. A palette where each colour is bound to a role (surface, border, focus ring, destructive) is a system, because now a component can ask for the role rather than the colour.',
      'That indirection is what lets one design survive a change of theme. Swap the values behind the roles and every screen follows.',
      '## Where the taste goes',
      'None of this removes judgement. Deciding that a brand is warm rather than cool, dense rather than airy, serif rather than grotesque: that is the part worth a designer’s time. The constraints exist so that the judgement is the only thing left to make.',
    ],
  },
  {
    slug: 'streaming-a-design-into-existence',
    title: 'Streaming a design into existence',
    excerpt:
      'Watching a layout assemble itself changes how the wait feels, and it changes what you can catch early.',
    date: '2026-07-19',
    updated: '2026-09-01',
    tag: 'Engineering',
    cover: '/images/blog/streaming-ui.webp',
    coverAlt:
      'A monitor showing a user interface assembling itself: the hero sharp, the lower half still fading in.',
    body: [
      'A design takes about a minute to generate. You can spend that minute looking at a spinner, or you can spend it watching the page build itself. We chose the second, and it turned out to matter for more than presentation.',
      '## Progress you can act on',
      'A spinner tells you the request has not failed yet. A design assembling itself tells you whether the layout is going the right way. If the hero comes back wrong you already know, thirty seconds before the run finishes.',
      '## The throttle is the whole trick',
      'Rendering every chunk as it arrives will peg a CPU and make the page stutter. Rendering a batch every couple of hundred milliseconds gets you a design that lands in around forty repaints and still reads as live.',
      'The other half is history. Streaming updates must not enter the undo stack. At one snapshot per chunk, a single generation would push out every real step in a matter of seconds.',
      '## Partial markup is fine',
      'A stream is cut mid-tag most of the time. The browser’s own parser closes whatever is dangling, which is exactly the behaviour a live preview wants. What it does not handle is a chunk boundary landing inside the opening tag of the root element, where the leftover attributes get parsed as text. That one is worth guarding.',
    ],
  },
  {
    slug: 'what-a-workflow-is-worth',
    title: 'One screen is a mock. Four screens is a product.',
    seoTitle: 'One screen is a mock, four is a product',
    excerpt:
      'The gap between a nice hero section and something you can actually review is the rest of the flow.',
    date: '2026-07-08',
    updated: '2026-09-01',
    tag: 'Product',
    cover: '/images/blog/four-screens.webp',
    coverAlt:
      'Four desktop frames in a row on a dark canvas: landing, pricing, checkout and confirmation, sharing one system.',
    body: [
      'A single generated screen is a lovely artefact and a poor decision-making tool. You cannot tell from a landing page whether the empty state works, whether the settings screen needs a sidebar, or whether the navigation survives a second level.',
      '## Flows expose the holes',
      'The moment you generate the screens around the first one, the questions get concrete. Where does this button go? What does the user see after they pay? What is this a dashboard of? The answers are cheap to get wrong on a canvas and expensive to get wrong in code.',
      '## Let the flow come from the design',
      'The obvious implementation is a fixed list of page types (dashboard, settings, profile) applied to whatever you generated. It is also the wrong one: the screens have nothing to do with the product you just designed.',
      'Reading the first screen and planning the journey from it costs one extra call and produces a flow that belongs to the thing. A pricing page implies checkout and a confirmation. An inbox implies a message view.',
      '## Consistency is the constraint',
      'Every screen after the first has an obligation the first one did not: it has to look like it belongs. Passing the existing markup along as the reference does more for that than any amount of instruction about spacing scales.',
    ],
  },
]

export const postBySlug = (slug: string) => POSTS.find((post) => post.slug === slug)

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
