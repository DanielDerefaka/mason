/**
 * The design system every generated page is held to.
 *
 * The prompt already forbade the right things — "purple-to-blue gradients,
 * glassmorphism cards, glow effects", "rounded cards with a soft shadow on
 * everything", "tight letter-spacing on large text". The instincts were never
 * the problem. The problem is that they are adjectives, and a model cannot
 * check itself against an adjective. "Steps between sizes are large enough to
 * notice" is unfalsifiable; "1.35x between display sizes" is arithmetic.
 *
 * So the numbers live here, once, and two things read them: the prompt text
 * below, and `design-audit.ts`, which measures a finished fragment against the
 * same values. A rule that is not checkable does not belong in this file, and a
 * rule that is checkable must not be written twice — the day the prompt asks
 * for 160px sections and the audit checks for 96px is the day both stop
 * meaning anything.
 *
 * Where the values come from: the shipped CSS of four Awwwards winners, read
 * as code rather than as screenshots. Sharplink (Studio Freight, SOTD 27 Aug
 * 2026), Terminal Industries (REJOUICE, SOTM Sep 2025), ERA Residence (The
 * First The Last, SOTD 31 Aug 2026) and the AI in Design Report 2026
 * (++hellohello, SOTD 26 Aug 2026, which is Framer-built and so the closest
 * published analogue to what this product makes). Their token layers agree with
 * each other far more than any of them agrees with a default Tailwind page,
 * and that agreement is what this file encodes.
 */

/**
 * The type ramp, uneven on purpose.
 *
 * The tell of a generated page is a flat modular scale: every step 1.25x apart,
 * so nothing on the page is clearly dominant. Real ones are dense where you
 * read and dramatic where you look. Sharplink ships 12 13 14 16 19 24 32 44 52
 * 68 88 — 1.08x to 1.19x between text sizes, 1.29x to 1.38x between display
 * sizes. ERA is more extreme still: 192 136 96 63 40 28 25, then a chasm down
 * to 13 11 9, with nothing at all in the middle.
 *
 * `mobile` is a value, not a breakpoint: the role keeps its name across screens
 * so a section keeps its identity, which is the trick that stops a phone layout
 * reading as a different page.
 */
export const TYPE_SCALE = [
  { role: 'd1', desktop: 128, mobile: 48, lineHeight: 0.88, tracking: -0.024, usage: 'The one line the page is about.' },
  { role: 'd2', desktop: 88, mobile: 40, lineHeight: 0.88, tracking: -0.024, usage: 'Section openers.' },
  { role: 'd3', desktop: 64, mobile: 32, lineHeight: 0.88, tracking: -0.024, usage: 'Large statements, statistics.' },
  { role: 'd4', desktop: 44, mobile: 26, lineHeight: 0.95, tracking: -0.016, usage: 'Sub-sections.' },
  { role: 't1', desktop: 32, mobile: 24, lineHeight: 1.15, tracking: -0.008, usage: 'Card and article titles.' },
  { role: 't2', desktop: 24, mobile: 20, lineHeight: 1.15, tracking: -0.008, usage: 'Lead paragraphs.' },
  { role: 't3', desktop: 19, mobile: 18, lineHeight: 1.15, tracking: -0.008, usage: 'Standfirsts, large UI.' },
  { role: 'b1', desktop: 16, mobile: 16, lineHeight: 1.5, tracking: -0.01, usage: 'Body copy.' },
  { role: 'b2', desktop: 14, mobile: 14, lineHeight: 1.5, tracking: -0.01, usage: 'Secondary body, captions.' },
  { role: 'l1', desktop: 12, mobile: 12, lineHeight: 1.4, tracking: 0.08, uppercase: true, usage: 'Micro-labels, eyebrows.' },
  { role: 'l2', desktop: 10, mobile: 10, lineHeight: 1.3, tracking: 0.24, uppercase: true, usage: 'Metadata, numerals.' },
] as const

/**
 * Linear at the bottom, geometric at the top. ERA's shipped scale exactly:
 * the ratios from s8 up are 1.5, 1.67, 1.7, which is what puts real air between
 * sections without inventing a number at every edge.
 */
export const SPACE = {
  desktop: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 160, 272],
  mobile: [0, 4, 8, 12, 16, 16, 24, 32, 48, 64, 96, 120],
} as const

/**
 * Section padding may only come from the top of the space scale.
 *
 * Generic output uses Tailwind's `py-20` or `py-24`, that is 80px to 96px, and
 * uses it between every section regardless of what the section is for. These
 * sites run 160px to 272px. The difference is 2x to 3x and it is most of why
 * one feels composed and the other feels stacked.
 */
export const SECTION_PADDING = { desktop: 160, mobile: 96 } as const

/** The hero line, at a 1440px viewport. Generic output stops at 48px to 60px. */
export const DISPLAY_MIN = 72

/** Above this size, line-height goes below 1 and tracking goes negative. */
export const DISPLAY_FLOOR = 64

/** Sharplink ships one radius: 6px. Terminal ships four, and 0 is a used option. Nobody is at 16px on everything. */
export const RADII = [0, 4, 8, 9999] as const

/** ERA publishes three durations and four easings and uses nothing else. */
export const MOTION = {
  durations: { s: 0.25, m: 0.5, l: 1.0 },
  easings: {
    out: 'cubic-bezier(0.25, 1, 0.5, 1)',
    inOut: 'cubic-bezier(0.76, 0, 0.24, 1)',
    circ: 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',
  },
  stagger: 0.08,
} as const

/**
 * Two columns on mobile, not one.
 *
 * Terminal Industries collapses to 2, and that single choice is what lets a
 * phone layout stay asymmetric instead of becoming a stack of identical cards.
 */
export const GRID = {
  columns: { desktop: 12, mobile: 2 },
  gutter: { desktop: 28, mobile: 16 },
  margin: { desktop: 'min(3.6vw, 96px)', mobile: '20px' },
  cap: 1920,
} as const

/**
 * The hue band that gives a generated page away.
 *
 * Tailwind's `indigo-500` is #6366f1, hue 239; `violet-500` is #8b5cf6, hue
 * 258. Adam Wathan, who chose indigo as Tailwind UI's placeholder, has publicly
 * apologised for what it did to the look of the web. The band is deliberately
 * wide enough to catch both and narrow enough to leave a real blue alone:
 * Sharplink's #0e76ff is hue 214 and must pass.
 */
export const SLOP_HUES = { from: 232, to: 295, minSaturation: 0.35 } as const

const list = (items: readonly (string | number)[]) => items.join(', ')

/**
 * The system as prompt text.
 *
 * Generated from the values above rather than written beside them, so a change
 * to the scale reaches the model and the audit in the same commit. Every line
 * here is an imperative with a number in it: anything that reads as taste
 * belongs in the Craft section of the prompt, not in this one.
 */
export const designSystemRules = (): string => {
  const scale = TYPE_SCALE.map(
    (step) =>
      `| ${step.role} | ${step.desktop} | ${step.mobile} | ${step.lineHeight} | ${step.tracking > 0 ? '+' : ''}${step.tracking}em |${
        'uppercase' in step && step.uppercase ? ' uppercase |' : '  |'
      }`,
  ).join('\n')

  return `Every value on the page comes from this system. Composition is yours;
values are not. A page that invents its own sizes is the thing that reads as
generated, and it reads that way even when every individual choice is
defensible.

### Type

Eleven roles. Desktop and mobile are two values of one role, so a section keeps
its identity across screens.

| role | desktop | mobile | line-height | letter-spacing | |
|---|---|---|---|---|---|
${scale}

- The ramp is uneven on purpose: about 1.15x between text sizes, about 1.38x
  between display sizes, and a visible gap between t1 and d4. A flat 1.25x
  ladder with every step present is the single clearest sign of a generated
  page, because nothing on it is dominant.
- The hero line is at least ${DISPLAY_MIN}px at 1440px, and d1 or d2 is where it should
  land. Timid display type is the commonest way a design that is otherwise
  right still reads as generated.
- Line-height goes **below 1** above ${DISPLAY_FLOOR}px. Not 1.1, not \`leading-tight\`. 0.88.
- Letter-spacing is a function of size and it changes sign: -0.024em on display,
  0 around 28px, and **+0.08em or more on uppercase labels below 12px**. At
  least one spaced uppercase micro-label belongs on the page. It is a signature
  of this category and it is absent from generated work entirely.
- Two families minimum: a display face that is not Inter, and a body face. A
  mono face for labels, numerals and metadata is the preferred third. Inter is
  a body face; it is never the display face.

### Colour

- Two grounds and one accent. The ground is never \`#ffffff\` and the ink is
  never \`#000000\`: use an off-white between #f0f0f0 and #f6f4ef, or a dark
  ground with a hue in it such as #17233b or #052424.
- **There is no grey.** Every grey is the ink colour at 5%, 10%, 30% or 60%
  alpha over the ground. Importing a slate or gray scale is what makes a page
  feel like several unrelated designs sharing a viewport, because that scale is
  a different hue family from the brand.
- Exactly one saturated accent hue. A second colour may only be a tint or a
  shade of it.
- Never indigo, violet or purple as the accent unless the brief names it.
- Supporting copy sits at roughly 45% to 60% ink, never at the headline's
  colour. The headline holds all the contrast.

### Surface

- Radius comes from ${list(RADII)}. Never 16px, and never one radius on every
  surface.
- **No box-shadow.** Separate surfaces with a 1px hairline at 10% ink, or by
  switching the section's ground. A soft shadow under every card is the
  texture of a template.
- Gradients are single-colour transparency ramps only: a scrim over media, a
  fade at an edge. Never between two hues, never behind or inside a heading,
  never as a blurred blob.

### Space

Twelve steps: ${list(SPACE.desktop)} desktop,
${list(SPACE.mobile)} mobile.

Section padding may only be ${SECTION_PADDING.desktop}px or more on desktop and
${SECTION_PADDING.mobile}px or more on mobile. Never 80px, never 96px on desktop, whatever the
section contains.

### Grid

${GRID.columns.desktop} columns desktop, **${GRID.columns.mobile} on mobile** — not one. A phone layout that is a
single stack of full-width cards has been resized rather than designed; keep at
least one section asymmetric at 390px. Gutter ${GRID.gutter.desktop}px / ${GRID.gutter.mobile}px, page margin
${GRID.margin.desktop} / ${GRID.margin.mobile}, content capped at ${GRID.cap}px.

### Motion

Three durations and named curves, and nothing else:

    --dur-s: ${MOTION.durations.s}s   --dur-m: ${MOTION.durations.m}s   --dur-l: ${MOTION.durations.l}s
    --ease-out:    ${MOTION.easings.out}
    --ease-in-out: ${MOTION.easings.inOut}
    --ease-circ:   ${MOTION.easings.circ}

Never the bare keyword \`ease\`, \`ease-in-out\` or \`linear\`, and never
\`transition: all\`. Stagger a revealed sequence by ${MOTION.stagger}s per item; identical
timing across a row is forbidden.

### Composition

- Left-align the hero unless the page has no imagery at all.
- No more than three things in the first viewport: the headline, one supporting
  line or one action, and one piece of media. No eyebrow-plus-subhead-plus-two-
  CTAs stack, no logo strip, no feature cards.
- The hero headline is under nine words and makes a specific claim. Not two
  imperative clauses.
- **Never three equal-width cards in a row.** If three things must be listed,
  vary their widths, set them as an editorial list separated by hairlines, or
  number them with l2 numerals.
- Portrait or extreme ratios for at least half the images: 3/4, 4/5, 8/11, or a
  letterbox such as 3/1. Not everything in 16/9.
- A full-height hero is \`calc(100dvh - <header height>)\`, in \`dvh\`, never a
  bare \`100vh\` and never a fixed pixel height.

### Choose four things once

At the top of the page decide, once: the accent hue, the display face, the
ground polarity of each section, and whether the grid is symmetric or
asymmetric. Every section below inherits those four. Improvisation is allowed in
composition and never in value.`
}
