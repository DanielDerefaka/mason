import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import { ExploreGallery } from '@/components/explore/gallery'
import { PublicConvex } from '@/components/explore/provider'
import { CtaSection } from '@/components/marketing/home/CtaSection'
import { JsonLd } from '@/components/marketing/JsonLd'
import { SITE_URL } from '@/lib/site'
import { breadcrumbs, webPage } from '@/lib/structured-data'
import { api } from '../../../../convex/_generated/api'

const DESCRIPTION =
  'Designs people sketched and SketchMason built, each one from a rough drawing. Remix any of them onto your own canvas, or draw a screen and start there.'

export const metadata: Metadata = {
  title: 'Explore designs made from sketches',
  description: DESCRIPTION,
}

/**
 * Rendered per request, on purpose.
 *
 * The rest of the marketing group prerenders at build, now that the root
 * layout reads nothing from the request. This page fetches the day's list from
 * Convex, and the build must never reach the backend: the production build
 * deploys the Convex functions in the same run, so at build time the query it
 * would call may not exist yet, and a preview build points at the dev backend,
 * whose gallery is not the site's. `revalidate` would put the same fetch back
 * into the build for the first render, so it is not set either. A request-time
 * render is what this page has always been; this line keeps it so.
 */
export const dynamic = 'force-dynamic'

type ExplorePreview = {
  id: string
  label: string
}

/** A label as the house writes them: no em dash, whatever was published. */
const plain = (label: string) => label.replace(/\s*[\u2014\u2013]\s*/g, ', ')

/**
 * First page of the gallery, for crawlers. The cards themselves sanitise in
 * the browser and cannot be server-rendered; the labels and an ItemList are
 * enough for a machine to see that the page is not empty.
 */
const loadPreview = async (): Promise<ExplorePreview[]> => {
  try {
    const page = await fetchQuery(api.explore.list, { cursor: null, limit: 12 })
    return page.items.map((item) => ({ id: item.id, label: plain(item.label) }))
  } catch {
    return []
  }
}

/**
 * /explore — the public gallery.
 *
 * The heading is server-rendered and reveals like every other marketing
 * section; the gallery beneath it is a client component and must not, since
 * its cards do not exist when the reveal observer looks for them.
 */
export default async function ExplorePage() {
  const preview = await loadPreview()
  const itemList =
    preview.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Designs sketched on SketchMason',
          itemListElement: preview.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            url: `${SITE_URL}/try?remix=${item.id}`,
          })),
        }
      : null

  return (
    <>
      {itemList ? <JsonLd data={itemList as Record<string, unknown>} /> : null}
      <JsonLd data={webPage('Explore', '/explore', DESCRIPTION)} />
      <JsonLd data={breadcrumbs([{ name: 'Explore', path: '/explore' }])} />
      <section className="pt-[100px] pb-[80px] md:pt-[140px] md:pb-[110px]">
        <div className="container-home">
          <div className="reveal max-w-[640px]">
            <span className="eyebrow">Explore</span>
            <h1 className="font-display text-foreground text-[clamp(2.2rem,4.6vw,3.4rem)] leading-[1.05] font-medium tracking-[-0.035em]">
              What people sketched today
            </h1>
            <p className="text-muted-foreground mt-5 max-w-[560px] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-snug">
              Every design here started as a rough drawing. Remix one, or draw your own.
            </p>
            <p className="text-muted-foreground mt-4 max-w-[560px] text-[0.95rem] leading-relaxed">
              New here? Read{' '}
              <Link href="/sketch-to-ui" className="underline underline-offset-4">
                how a sketch becomes a UI design
              </Link>
              , or open{' '}
              <Link href="/try" className="underline underline-offset-4">
                the canvas
              </Link>{' '}
              and draw one. No account needed.
            </p>
          </div>

          {preview.length > 0 ? (
            <noscript>
              <ul className="mt-8 list-disc space-y-2 pl-5 text-[0.95rem] text-muted-foreground">
                {preview.map((item) => (
                  <li key={item.id}>{item.label}</li>
                ))}
              </ul>
            </noscript>
          ) : null}

          <div className="mt-10 md:mt-12">
            <PublicConvex>
              <ExploreGallery />
            </PublicConvex>
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}
