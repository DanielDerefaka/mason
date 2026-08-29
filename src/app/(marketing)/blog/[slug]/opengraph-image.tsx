import { ImageResponse } from 'next/og'

import { postBySlug } from '@/content/posts'

/**
 * A post's own share card: the mark, the title, where it is from.
 *
 * Every post was unfurling as the site card — the root `opengraph-image.tsx`,
 * inherited by any route without one of its own — so four different links
 * showed one identical picture, and the structured data had no image of the
 * post to point at. Composed from the title rather than drawn per post, for
 * the reason the root card gives: a fifth post gets a card by being written,
 * with no art step between the text and the unfurl.
 */
export const runtime = 'nodejs'
export const alt = 'A post from the Mason blog'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** The Mason mark, as drawn in `src/components/logo-mark.tsx`. */
const Mark = ({ size: px }: { size: number }) => (
  <svg viewBox="0 50.73 386 385.54" width={px} height={px} fill="#ffffff">
    <path d="M0 243.5C0 201.907 13.1882 163.391 35.6157 131.896H132.053V149.944C101.475 169.858 81.2632 204.321 81.2632 243.5C81.2632 305.137 131.289 355.104 193 355.104V436.271C86.409 436.271 0 349.964 0 243.5Z" />
    <path d="M350.384 355.104C372.812 323.609 386 285.093 386 243.5C386 137.035 299.591 50.729 193 50.729V131.896C254.711 131.896 304.737 181.863 304.737 243.5C304.737 282.679 284.525 317.142 253.947 337.055V355.104H350.384Z" />
  </svg>
)

export default async function PostImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = postBySlug(slug)
  // A plain 404 rather than a card for a post that does not exist: the page
  // beside this answers the same, and the unfurl of nothing should be nothing.
  if (!post) return new Response(null, { status: 404 })

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
            {post.title}
          </div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.6)' }}>{post.tag}</div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.42)' }}>
          sketchmason.com/blog
        </div>
      </div>
    ),
    size,
  )
}
