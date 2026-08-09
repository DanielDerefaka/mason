import type { SVGProps } from 'react'

/**
 * The Mason mark — a ring split into two counter-rotated arcs, each with a
 * squared tab where it breaks.
 *
 * Supplied as artwork; the only change is the viewBox, tightened from the
 * 386x487 export to the 386x385.5 the paths actually occupy, so the glyph
 * centres in a square box at every size. Fills with `currentColor`, so it
 * inherits whichever theme it is dropped into.
 */
export const LogoMark = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 50.73 386 385.54"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    focusable={false}
    className={className}
    {...props}
  >
    <path d="M0 243.5C0 201.907 13.1882 163.391 35.6157 131.896H132.053V149.944C101.475 169.858 81.2632 204.321 81.2632 243.5C81.2632 305.137 131.289 355.104 193 355.104V436.271C86.409 436.271 0 349.964 0 243.5Z" />
    <path d="M350.384 355.104C372.812 323.609 386 285.093 386 243.5C386 137.035 299.591 50.729 193 50.729V131.896C254.711 131.896 304.737 181.863 304.737 243.5C304.737 282.679 284.525 317.142 253.947 337.055V355.104H350.384Z" />
  </svg>
)
