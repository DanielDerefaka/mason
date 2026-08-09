import { ApproachSection } from '@/components/marketing/home/ApproachSection'
import { CtaSection } from '@/components/marketing/home/CtaSection'
import { FaqSection } from '@/components/marketing/home/FaqSection'
import { HeroSection } from '@/components/marketing/home/HeroSection'
import { IntroductionSection } from '@/components/marketing/home/IntroductionSection'
import { MarqueeStrip } from '@/components/marketing/home/MarqueeStrip'
import { ServicesSection } from '@/components/marketing/home/ServicesSection'

export const metadata = {
  title: 'Sketch to Design — draw the shape, get the product',
  description:
    'Rough out a screen with rectangles. Get a design system from your mood board, a finished interface from your sketch, and the whole flow around it.',
}

/**
 * Seven sections, down from ten. The tech-stack strip, the featured-works
 * grid and the platform logo wall were all built to hold a studio's client
 * work; with nothing real to put in them they were only repeating the same
 * four screenshots, so they are gone rather than filled with filler.
 */
export default function Home() {
  return (
    <>
      <HeroSection />
      <IntroductionSection />
      <ServicesSection />
      <MarqueeStrip />
      <ApproachSection />
      <FaqSection />
      <CtaSection />
    </>
  )
}
