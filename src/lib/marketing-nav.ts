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
  { label: 'Blog', href: '/blog' },
]

/** Ordered home-page section ids the header observes to highlight the active link. */
export const HOME_SECTION_IDS = [
  'hero',
  'tech-stack',
  'introduction',
  'featured-works',
  'services',
  'approach',
  'faqs',
  'cta',
] as const

/** Which nav label lights up for a given home section. */
export const SECTION_TO_NAV: Record<string, string> = {
  hero: 'Home',
  'tech-stack': 'Home',
  introduction: 'About Us',
  'featured-works': 'Features',
  services: 'Features',
  approach: 'How It Works',
  faqs: 'How It Works',
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
      { label: 'FAQs', href: '/#faqs' },
      { label: 'Start free', href: '/auth/sign-up' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '/about-us' },
      { label: 'Blog', href: '/blog' },
      { label: 'Sign in', href: '/auth/sign-in' },
      { label: 'Create account', href: '/auth/sign-up' },
    ],
  },
  {
    title: 'Inside the app',
    links: [
      { label: 'Infinite canvas', href: '/#services' },
      { label: 'Style guides', href: '/#services' },
      { label: 'Design chat', href: '/#approach' },
      { label: 'Flow generation', href: '/#approach' },
    ],
  },
]

export interface SocialLink {
  label: string
  href: string
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/' },
  { label: 'Facebook', href: 'https://www.facebook.com/' },
  { label: 'Twitter', href: 'https://twitter.com/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/' },
]

export const CONTACT = {
  email: 'hello@sketchtodesign.app',
  phone: '—',
  whatsapp: 'Support',
  location: 'Built remotely',
}

export const COPYRIGHT = `© ${new Date().getFullYear()} Sketch to Design. All rights reserved.`
