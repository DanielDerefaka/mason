import { CaseInPointSection } from '@/components/marketing/home/CaseInPointSection'
import { CreditsSection } from '@/components/marketing/home/CreditsSection'
import { CtaSection } from '@/components/marketing/home/CtaSection'
import { FaqSection } from '@/components/marketing/home/FaqSection'
import { FeatureSections } from '@/components/marketing/home/FeatureSections'
import { HeroSection } from '@/components/marketing/home/HeroSection'
import { ManifestoSection } from '@/components/marketing/home/ManifestoSection'
import { ServicesSection } from '@/components/marketing/home/ServicesSection'
import { JsonLd } from '@/components/marketing/JsonLd'
import { SITE_URL } from '@/lib/site'

/**
 * One sentence, used twice: as the page's meta description and as the
 * `description` of the SoftwareApplication below it. Structured data that
 * contradicts the description on the same page is worse than none.
 */
const DESCRIPTION =
  'Rough out a screen with rectangles. Get a design system from your mood board, a finished interface from your sketch, and the whole flow around it.'

export const metadata = {
  // `absolute` opts out of the root's "%s · Mason" template: this title already
  // opens with the word, and the suffix would say it twice.
  title: { absolute: 'Mason — draw the shape, get the product' },
  description: DESCRIPTION,
}

/**
 * No `offers` and no `price` in this block, deliberately.
 *
 * What the product costs is still being decided, and an offer here is not a
 * note in a file — it is a price Google is entitled to print beside the site
 * in a result. Structured data is a claim made to a machine that will repeat
 * it, so it says only what is settled: what this is, where it runs, and where
 * it lives.
 */
const SOFTWARE_APPLICATION = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Mason',
  url: SITE_URL,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description: DESCRIPTION,
}

/**
 * The order is the reference's: a left-aligned hero over the product, one
 * feature per screen, the capability grid, proof, a statement, what it costs,
 * questions, and the close. The marquee strip and the two-column "approach"
 * grid went with the old layout — each feature now gets a section of its own
 * rather than a card in a grid.
 *
 * This used to redirect to /try whenever `FREE_WEEK` was on, which is why the
 * landing page vanished the moment the flag was set in production: the whole
 * marketing site became unreachable from its own front door, and every
 * campaign link resolved to the canvas instead of the pitch. The header, the
 * footer and the hero all lead to /try on their own now — the visitor is
 * offered the canvas rather than moved to it, which is what the redirect was
 * really for. The free-week gate on /auth/* is untouched.
 */
export default function Home() {
  return (
    <>
      <JsonLd data={SOFTWARE_APPLICATION} />
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
