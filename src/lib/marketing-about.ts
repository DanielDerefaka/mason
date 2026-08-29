/**
 * The one sentence /about-us opens with, used twice: as the page's meta
 * description and as the first thing on the page.
 *
 * Definitional on purpose. "Mason" alone is a name-collision query — jars,
 * bricklayers, a 2016 Dribbble template, a university — and /about-us is the
 * page Google quotes when the homepage does not win the result. So the sentence
 * says what this is, where it lives, and what goes in and comes out, with the
 * domain in it: quoted on its own, it still answers the question. No prices
 * and no figures, for the reason `marketing-faq.ts` gives — a quoted number
 * outlives the thing it counted.
 *
 * A module of its own rather than a constant in `AboutContent.tsx`, which is
 * a client component: a value imported from a "use client" file into a server
 * page arrives as a client reference, not as a string.
 */
export const ABOUT_DEFINITION =
  'Mason (sketchmason.com) turns rough sketches — rectangles and boxes — into finished user interfaces, design systems, and flows.'
