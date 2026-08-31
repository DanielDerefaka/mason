import type { Metadata } from 'next'
import { fetchQuery } from 'convex/nextjs'

import { ExploreGallery } from '@/components/explore/gallery'
import { CtaSection } from '@/components/marketing/home/CtaSection'
import { JsonLd } from '@/components/marketing/JsonLd'
import { SITE_URL } from '@/lib/site'
import { api } from '../../../../convex/_generated/api'

export const metadata: Metadata = {
  title: 'Explore',
  description:
    'Designs people sketched and SketchMason built. Remix one, or draw your own.',
}

type ExplorePreview = {
  id: string
  label: string
}

/**
 * First page of the gallery, for crawlers. The cards themselves sanitise in
 * the browser and cannot be server-rendered; the labels and an ItemList are
 * enough for a machine to see that the page is not empty.
 */
const loadPreview = async (): Promise<ExplorePreview[]> => {
  try {
    const page = await fetchQuery(api.explore.list, { cursor: null, limit: 12 })
    return page.items.map((item) => ({ id: item.id, label: item.label }))
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
            <ExploreGallery />
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}
