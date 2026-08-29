export type Post = {
  slug: string
  title: string
  excerpt: string
  date: string
  readingMinutes: number
  tag: string
  /** Paragraphs and headings. A heading is any line starting with "## ". */
  body: string[]
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
    slug: 'why-your-sketch-matters-more-than-your-prompt',
    title: 'Your sketch matters more than your prompt',
    excerpt:
      'The fastest way to improve a generated design is not a better model. It is three words written inside a box.',
    date: '2026-08-04',
    readingMinutes: 4,
    tag: 'Craft',
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
    readingMinutes: 5,
    tag: 'Design systems',
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
    readingMinutes: 3,
    tag: 'Engineering',
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
    excerpt:
      'The gap between a nice hero section and something you can actually review is the rest of the flow.',
    date: '2026-07-08',
    readingMinutes: 4,
    tag: 'Product',
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
