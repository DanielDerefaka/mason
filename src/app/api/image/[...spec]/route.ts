import { NextResponse, type NextRequest } from 'next/server'

import { findPhoto, pexelsConfigured } from '@/lib/pexels'

/**
 * The photograph slot in a generated design.
 *
 *   /api/image/1200/800/coffee,shop,interior?i=2
 *
 * Deliberately the same shape loremflickr used — width, height, keywords, and
 * a per-image counter — because that shape is what the model already knows how
 * to write, and a prompt change is a generation-quality risk in a way a route
 * is not.
 *
 * It redirects rather than proxying. The bytes then come from Pexels' own CDN
 * straight to the browser, so this server never carries image traffic, and the
 * redirect itself caches for a day.
 *
 * Public on purpose: a shared design is read by people with no account, and an
 * image that 302s to the sign-in page is a broken design.
 */
export const runtime = 'nodejs'

/** Big enough for a retina hero, small enough that nobody can ask for a poster. */
const MAX_EDGE = 2400
const MIN_EDGE = 16

const clamp = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(MAX_EDGE, Math.max(MIN_EDGE, Math.round(value))) : fallback

/**
 * What a slot shows when there is no photograph for it.
 *
 * A neutral gradient rather than a broken-image icon or a 404. Every path into
 * this route can fail — no key configured, the stock API down, a query with no
 * results — and in all of them the design around the image is fine. A grey
 * panel reads as a picture that has not loaded; a broken icon reads as a
 * product that does not work.
 */
const placeholder = (width: number, height: number) =>
  new NextResponse(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="#e8e8ea"/><stop offset="100%" stop-color="#c9c9ce"/>` +
      `</linearGradient></defs>` +
      `<rect width="${width}" height="${height}" fill="url(#g)"/></svg>`,
    {
      headers: {
        'Content-Type': 'image/svg+xml',
        // Short, so a design stops showing grey panels once the key is set or
        // the stock API recovers.
        'Cache-Control': 'public, max-age=60',
      },
    },
  )

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spec: string[] }> },
) {
  const { spec } = await params
  const [rawWidth, rawHeight, ...rest] = spec

  const width = clamp(Number(rawWidth), 1200)
  const height = clamp(Number(rawHeight), 800)
  // Keywords can arrive as one segment or several, depending on how the model
  // punctuated them.
  const keywords = decodeURIComponent(rest.join(' ')).trim()

  if (!keywords || !pexelsConfigured()) return placeholder(width, height)

  const index = Number(request.nextUrl.searchParams.get('i') ?? '0')

  try {
    const photo = await findPhoto(keywords, width, height, Number.isFinite(index) ? index : 0)
    if (!photo) return placeholder(width, height)

    return NextResponse.redirect(photo.url, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        // Pexels asks that photographers be credited wherever their work is
        // shown. The design itself has nowhere sensible to put a name, so the
        // credit travels on the response and the app surfaces it — see the
        // credit line on the preview and in an exported file.
        'X-Photo-Credit': photo.photographer,
        'X-Photo-Credit-Url': photo.photographerUrl,
      },
    })
  } catch (error) {
    console.error('[api/image]', error)
    return placeholder(width, height)
  }
}
