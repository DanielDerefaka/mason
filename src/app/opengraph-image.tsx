import { ImageResponse } from 'next/og'

/**
 * The site's share card, inherited by every route without one of its own.
 *
 * Before this there was no og:image anywhere but a shared design, so the "Share
 * on X" button posted a bare blue link. Composed rather than a static file for
 * the same reason `s/[token]` is: one place to change the wording, and no
 * export step between editing it and shipping it.
 *
 * Deliberately says nothing the product does not do — no counts, no claims
 * about speed, and no "code": the subtitle was "Sketch → code", which names a
 * category the product is not in. A card that oversells is the first thing a
 * visitor measures the canvas against.
 */
export const runtime = 'nodejs'
export const alt = 'SketchMason — draw the shape, get the product'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** The Mason mark, as drawn in `src/components/logo-mark.tsx`. */
const Mark = ({ size: px }: { size: number }) => (
  <svg viewBox="0 50.73 386 385.54" width={px} height={px} fill="#ffffff">
    <path d="M0 243.5C0 201.907 13.1882 163.391 35.6157 131.896H132.053V149.944C101.475 169.858 81.2632 204.321 81.2632 243.5C81.2632 305.137 131.289 355.104 193 355.104V436.271C86.409 436.271 0 349.964 0 243.5Z" />
    <path d="M350.384 355.104C372.812 323.609 386 285.093 386 243.5C386 137.035 299.591 50.729 193 50.729V131.896C254.711 131.896 304.737 181.863 304.737 243.5C304.737 282.679 284.525 317.142 253.947 337.055V355.104H350.384Z" />
  </svg>
)

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(160deg, #0a0a0a 0%, #161616 100%)',
          color: '#ffffff',
          fontFamily: 'Inter, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Mark size={56} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 112, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>
            SketchMason
          </div>
          <div style={{ fontSize: 46, color: 'rgba(255,255,255,0.66)', letterSpacing: -1 }}>
            Draw the shape, get the product
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.42)' }}>
          sketchmason.com
        </div>
      </div>
    ),
    size,
  )
}
