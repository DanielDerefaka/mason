import { CaseInPointSection } from '@/components/marketing/home/CaseInPointSection'
import { CreditsSection } from '@/components/marketing/home/CreditsSection'
import { CtaSection } from '@/components/marketing/home/CtaSection'
import { FaqSection } from '@/components/marketing/home/FaqSection'
import { FeatureSections } from '@/components/marketing/home/FeatureSections'
import { HeroSection } from '@/components/marketing/home/HeroSection'
import { ManifestoSection } from '@/components/marketing/home/ManifestoSection'
import { ServicesSection } from '@/components/marketing/home/ServicesSection'

export const metadata = {
  title: 'Mason — draw the shape, get the product',
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
export default function Home() {
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
