/**
 * The one sentence /about-us opens with, used twice: as the page's meta
 * description and as the first thing on the page.
 *
 * Definitional on purpose. "Mason" alone is a name-collision query — jars,
 * bricklayers, a 2016 Dribbble template, a university — and /about-us is the
 * page Google quotes when the homepage does not win the result. So the sentence
 * gives both names, the public one and the short one the product uses, and
 * says what goes in and what comes out: quoted on its own, it still answers
 * the question. The domain used to be in it, back when the name alone could
 * not carry the query; the name is the domain now. No prices and no figures,
 * for the reason `marketing-faq.ts` gives — a quoted number outlives the
 * thing it counted.
 *
 * A module of its own rather than a constant in `AboutContent.tsx`, which is
 * a client component: a value imported from a "use client" file into a server
 * page arrives as a client reference, not as a string.
 */
export const ABOUT_DEFINITION =
  'SketchMason — Mason for short — turns rough sketches of rectangles and boxes into finished user interfaces, design systems, and flows.'
