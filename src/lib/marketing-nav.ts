/** Single source of truth for the marketing site's navigation and footer. */
export interface NavItem {
  label: string
  href: string
  /** Home-page section id, when this nav item scrolls rather than navigates. */
  sectionId?: string
}

export const HEADER_NAV: NavItem[] = [
  { label: 'Home', href: '/', sectionId: 'hero' },
  { label: 'About Us', href: '/about-us' },
  { label: 'Features', href: '/#services', sectionId: 'services' },
  { label: 'How It Works', href: '/#approach', sectionId: 'approach' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Blog', href: '/blog' },
  { label: 'Explore', href: '/explore' },
]

/** Ordered home-page section ids the header observes to highlight the active link. */
export const HOME_SECTION_IDS = [
  'hero',
  'introduction',
  'services',
  'approach',
  'faqs',
  'cta',
] as const

/** Which nav label lights up for a given home section. */
export const SECTION_TO_NAV: Record<string, string> = {
  hero: 'Home',
  introduction: 'About Us',
  services: 'Features',
  approach: 'How It Works',
  faqs: 'FAQ',
  cta: 'How It Works',
}

export interface FooterColumn {
  title: string
  links: NavItem[]
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#services' },
      { label: 'How it works', href: '/#approach' },
      { label: 'FAQs', href: '/faq' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Compare', href: '/compare' },
      // The canvas, not the sign-up form. "Create account" in the next column
      // is still there for anyone who wants one; this link is for the visitor
      // who does not, and it used to send them to the same page.
      { label: 'Try it free, no sign-up', href: '/try' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '/about-us' },
      { label: 'Blog', href: '/blog' },
      { label: 'Sketch to UI', href: '/sketch-to-ui' },
      { label: 'Sign in', href: '/auth/sign-in' },
      { label: 'Create account', href: '/auth/sign-up' },
    ],
  },
  {
    title: 'Inside the app',
    links: [
      { label: 'Infinite canvas', href: '/#services' },
      { label: 'Style guides', href: '/#services' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
]

export interface SocialLink {
  label: string
  href: string
}

/**
 * Only accounts that exist.
 *
 * This was four icons pointing at instagram.com, facebook.com, twitter.com and
 * linkedin.com — the platforms' own front doors, with no handle on the end of
 * any of them. A row of buttons that dump a visitor on a logged-out Facebook
 * home page reads as a site nobody finished, and it costs more trust than four
 * icons buy. One real account beats four decorative ones; add the others back
 * as they are actually opened.
 */
export const SOCIAL_LINKS: SocialLink[] = [
  // Official product account. Footer renders `label: 'X'` only; the founder
  // handle stays in this list so `sameAs` and /llms.txt still name it.
  { label: 'X', href: 'https://x.com/usesketchmason' },
  { label: 'Founder', href: 'https://x.com/danieldxdere' },
]

/**
 * Press marks. Not in SOCIAL_LINKS: that list is `sameAs` and /llms.txt, and
 * a newsletter badge is a citation, not an account we own.
 */
export const PRESS_BADGES: {
  href: string
  src: string
  alt: string
  width: number
  height: number
}[] = [
  {
    href: 'https://tools.launchllama.co?utm_source=badge&utm_medium=referral',
    src: 'https://tools.launchllama.co/featured-badge.png?v=2',
    alt: 'As seen on Launch Llama Newsletter',
    width: 200,
    height: 50,
  },
]

export const CONTACT = {
  // The public inbox has to live on the canonical host. mason.design is
  // someone else's portfolio, and printing that address taught crawlers the
  // wrong entity owned the product.
  email: 'hello@sketchmason.com',
  // No phone row: there is no number, and the placeholder that stood here was
  // the one em dash the copy sweep had to exempt.
  whatsapp: 'Support',
  location: 'Built remotely',
}

export const COPYRIGHT = `© ${new Date().getFullYear()} SketchMason. All rights reserved.`
