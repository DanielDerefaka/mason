import { ImageResponse } from 'next/og'
import { fetchQuery } from 'convex/nextjs'

import { api } from '../../../../convex/_generated/api'

/**
 * The share card when there is no captured preview.
 *
 * Only the label and the mark. The design's own markup cannot be drawn here:
 * the sanitiser that makes it safe to render is browser-only, and this image
 * is composed on the server with no DOM — so rather than draw a design unsafely
 * or draw nothing, the card names the design and says where it came from.
 */
export const runtime = 'nodejs'
export const alt = 'Made with Mason'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** The Mason mark, as drawn in `src/components/logo-mark.tsx`. */
const Mark = ({ size: px }: { size: number }) => (
  <svg viewBox="0 50.73 386 385.54" width={px} height={px} fill="#ffffff">
    <path d="M0 243.5C0 201.907 13.1882 163.391 35.6157 131.896H132.053V149.944C101.475 169.858 81.2632 204.321 81.2632 243.5C81.2632 305.137 131.289 355.104 193 355.104V436.271C86.409 436.271 0 349.964 0 243.5Z" />
    <path d="M350.384 355.104C372.812 323.609 386 285.093 386 243.5C386 137.035 299.591 50.729 193 50.729V131.896C254.711 131.896 304.737 181.863 304.737 243.5C304.737 282.679 284.525 317.142 253.947 337.055V355.104H350.384Z" />
  </svg>
)

export default async function ShareImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const shared = await fetchQuery(api.shares.getSharedDesign, { token }).catch(() => null)
  // Long labels are trimmed rather than wrapped past the frame: a card is a
  // headline, not a paragraph.
  const label = (shared?.label ?? 'A design').slice(0, 80)

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
          <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: -0.5 }}>Mason</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.6)' }}>
            Sketched by hand. Made with Mason.
          </div>
        </div>
      </div>
    ),
    size,
  )
}
