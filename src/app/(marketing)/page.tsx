import { CaseInPointSection } from '@/components/marketing/home/CaseInPointSection'
import { CreditsSection } from '@/components/marketing/home/CreditsSection'
import { CtaSection } from '@/components/marketing/home/CtaSection'
import { FaqSection } from '@/components/marketing/home/FaqSection'
import { FeatureSections } from '@/components/marketing/home/FeatureSections'
import { HeroSection } from '@/components/marketing/home/HeroSection'
import { ManifestoSection } from '@/components/marketing/home/ManifestoSection'
import { ServicesSection } from '@/components/marketing/home/ServicesSection'
import { JsonLd } from '@/components/marketing/JsonLd'
import { ORGANIZATION, POSITIONING } from '@/lib/brand'
import { SITE_URL } from '@/lib/site'

/**
 * One sentence, used twice: as the page's meta description and as the
 * `description` of the SoftwareApplication below it. Structured data that
 * contradicts the description on the same page is worse than none. The
 * sentence is the positioning line in `@/lib/brand`, which the hero prints
 * too — a visitor and a crawler are told the same thing.
 */
const DESCRIPTION = POSITIONING

export const metadata = {
  // `absolute` opts out of the root's "%s | SketchMason" template: this title
  // already opens with the name, and the suffix would say it twice.
  title: { absolute: 'SketchMason: draw the shape, get the product' },
  description: DESCRIPTION,
}

/**
 * No `offers` and no `price` in this block, deliberately.
 *
 * What the product costs is still being decided, and an offer here is not a
 * note in a file — it is a price Google is entitled to print beside the site
 * in a result. Structured data is a claim made to a machine that will repeat
 * it, so it says only what is settled: what this is, where it runs, where it
 * lives, and which accounts are its own.
 */
const SOFTWARE_APPLICATION = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  // Both names, on both blocks. SketchMason is the public name and Mason is
  // what the product calls itself, and `alternateName` is the formal,
  // machine-readable statement that they are one entity — without it a search
  // engine holds two brands, one of which shares its name with a jar, a
  // university and a bricklayer.
  name: 'SketchMason',
  alternateName: 'Mason',
  url: SITE_URL,
  // A design tool, not a developer one: the category is the claim the copy
  // makes everywhere else, and a machine reads this field before the prose.
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  description: DESCRIPTION,
  // The accounts that are the site's own, so a machine reading this does not
  // have to guess. Google's AI Overview for the brand query was crediting an
  // Instagram @sketchmason — somebody at George Mason — to this site, because
  // the site declared no social identity and the name was the only signal.
  // Read from the Organization rather than spelled out again: one place says
  // which accounts exist, and /llms.txt reads the same one.
  sameAs: ORGANIZATION.sameAs,
}

/**
 * The organisation behind the application, as a block of its own. Google
 * reads a publisher from the homepage, and every BlogPosting names the same
 * object as its `publisher`, so the entity is declared once and the pages
 * that mention it all mean the same thing by it.
 */
const ORGANIZATION_BLOCK = { '@context': 'https://schema.org', ...ORGANIZATION }

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
      <JsonLd data={ORGANIZATION_BLOCK} />
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
