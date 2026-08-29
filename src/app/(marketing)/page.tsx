import { redirect } from 'next/navigation'

import { CaseInPointSection } from '@/components/marketing/home/CaseInPointSection'
import { CreditsSection } from '@/components/marketing/home/CreditsSection'
import { CtaSection } from '@/components/marketing/home/CtaSection'
import { FaqSection } from '@/components/marketing/home/FaqSection'
import { FeatureSections } from '@/components/marketing/home/FeatureSections'
import { HeroSection } from '@/components/marketing/home/HeroSection'
import { ManifestoSection } from '@/components/marketing/home/ManifestoSection'
import { ServicesSection } from '@/components/marketing/home/ServicesSection'
import { isFreeWeek } from '@/lib/try/free-week'

export const metadata = {
  // `absolute` opts out of the root's "%s · Mason" template: this title already
  // opens with the word, and the suffix would say it twice.
  title: { absolute: 'Mason — draw the shape, get the product' },
  description:
    'Rough out a screen with rectangles. Get a design system from your mood board, a finished interface from your sketch, and the whole flow around it.',
}

/**
 * The order is the reference's: a left-aligned hero over the product, one
 * feature per screen, the capability grid, proof, a statement, what it costs,
 * questions, and the close. The marquee strip and the two-column "approach"
 * grid went with the old layout — each feature now gets a section of its own
 * rather than a card in a grid.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // During the free week the front door is the canvas itself.
  //
  // The query string comes along. A campaign link is `/?utm_source=twitter&…`, and
  // `redirect('/try')` drops it — the browser never loads a URL carrying the
  // parameters, so the analytics script never sees them and every visit from
  // every post lands in the same undifferentiated pile. The one thing a
  // launch week needs to know is which post worked.
  if (isFreeWeek()) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === 'string') query.set(key, value)
      else if (Array.isArray(value)) for (const item of value) query.append(key, item)
    }
    const suffix = query.toString()
    redirect(suffix ? `/try?${suffix}` : '/try')
  }

  return (
    <>
      <HeroSection />
      <FeatureSections />
      <ServicesSection />
      <CaseInPointSection />
      <ManifestoSection />
      <CreditsSection />
      <FaqSection />
      <CtaSection />
    </>
  )
}
