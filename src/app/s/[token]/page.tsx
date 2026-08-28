import type { Metadata } from 'next'
import { fetchQuery } from 'convex/nextjs'

import { SharedDesign } from '@/components/share/shared-design'
import { api } from '../../../../convex/_generated/api'

type SharePageProps = { params: Promise<{ token: string }> }

/**
 * The card a share link unfurls into.
 *
 * A link posted to X with no image is a grey box with a domain in it; the
 * whole point of sharing a design is that the design is what people see. The
 * preview PNG is captured in the browser and stored beside the share; when
 * there is none — an older share, a capture that failed — the OG route next
 * to this file draws a card from the label instead.
 */
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params
  const shared = await fetchQuery(api.shares.getSharedDesign, { token }).catch(() => null)

  const label = shared?.label ?? 'Shared design'
  const title = `${label} · Made with Mason`
  const description = 'Sketched by hand, turned into a real page by Mason.'
  const image = shared?.previewUrl ?? `/s/${token}/opengraph-image`

  return {
    title,
    description,
    openGraph: { title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    // A share link is unguessable but not secret enough to want indexed.
    robots: { index: false, follow: false },
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params
  return <SharedDesign token={token} />
}

/**
 * `share_opened` used to be bumped here, in the server render.
 *
 * Which counted the wrong thing: a link posted to X is fetched by X's card
 * crawler, then by Slack's, then by every preview bot the link passes
 * through, and a page render also happens for `generateMetadata`. The free
 * week's headline number would have been mostly robots. It is recorded from
 * the browser now — see `SharedDesign` — where a crawler that does not run
 * scripts cannot reach it.
 */
