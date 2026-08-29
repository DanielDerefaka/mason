import type { Metadata } from 'next'

import { ExploreGallery } from '@/components/explore/gallery'
import { CtaSection } from '@/components/marketing/home/CtaSection'

export const metadata: Metadata = {
  title: 'Explore',
  description:
    'Designs people sketched and SketchMason built. Remix one, or draw your own.',
}

/**
 * /explore — the public gallery.
 *
 * The heading is server-rendered and reveals like every other marketing
 * section; the gallery beneath it is a client component and must not, since
 * its cards do not exist when the reveal observer looks for them.
 */
export default function ExplorePage() {
  return (
    <>
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

          <div className="mt-10 md:mt-12">
            <ExploreGallery />
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}
