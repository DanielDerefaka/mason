import { ApproachSection } from '@/components/marketing/home/ApproachSection'
import { CtaSection } from '@/components/marketing/home/CtaSection'
import { FaqSection } from '@/components/marketing/home/FaqSection'
import { FeaturedWorksSection } from '@/components/marketing/home/FeaturedWorksSection'
import { HeroSection } from '@/components/marketing/home/HeroSection'
import { IntroductionSection } from '@/components/marketing/home/IntroductionSection'
import { MarqueeStrip } from '@/components/marketing/home/MarqueeStrip'
import { PlatformSection } from '@/components/marketing/home/PlatformSection'
import { ServicesSection } from '@/components/marketing/home/ServicesSection'
import { TechStackSection } from '@/components/marketing/home/TechStackSection'

export const metadata = {
  title: 'Sketch to Design — draw the shape, get the product',
  description:
    'Rough out a screen with rectangles. Get a design system from your mood board, a finished interface from your sketch, and the whole flow around it.',
}

/** Section order matches the reference layout this was ported from. */
export default function Home() {
  return (
    <>
      <HeroSection />
      <TechStackSection />
      <IntroductionSection />
      <FeaturedWorksSection />
      <ServicesSection />
      <PlatformSection />
      <MarqueeStrip />
      <ApproachSection />
      <FaqSection />
      <CtaSection />
    </>
  )
}
