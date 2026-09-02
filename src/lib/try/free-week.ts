import { HERO } from '../marketing-content'

/**
 * The free-week switch, read on the server only.
 *
 * Deliberately not a NEXT_PUBLIC variable: the flag decides whether the auth
 * screens are open and what the hero's second pill offers, and both of those
 * are rendered on the server. Inlining it into the client bundle would make
 * turning the week off a rebuild rather than an environment change. Client
 * components that need it (`SiteHeader`, `MobileNav`, `SiteFooter`,
 * `TryGuestGate`) take it as a prop from the server component above them.
 *
 * What the switch does, in full: `auth/sign-up/layout.tsx` and
 * `auth/sign-in/layout.tsx` send their forms to /try, the header, the mobile
 * menu and the footer drop the links that pointed at them, the hero pill
 * below changes, and /try's exits stop offering an account — the "Keep this
 * canvas" button is not rendered at all. The week is /try and nothing else.
 *
 * What it must never do: gate `/`, which took the landing page off the
 * internet for a day; close the password reset, which stranded anybody
 * mid-reset; or reach a call to action, since /try is public with or without
 * the week (`CtaSection` is pinned not to read it). Reopening everything is
 * `FREE_WEEK=false`, and sessions already issued are untouched either way.
 */
export const isFreeWeek = () => process.env.FREE_WEEK === 'true'

/**
 * The hero's second pill: label and destination together, as one value.
 *
 * They used to travel apart. The label came from `marketing-content.ts` and
 * the href from a `ctaHref()` here, so during the week the hero read "Create
 * an account" and opened the guest canvas. A pill whose words and destination
 * are chosen in two files can disagree; one that returns both cannot.
 *
 * Explore rather than /try during the week, because the primary pill beside
 * it already goes to /try, and two pills to one place is one pill.
 */
export const heroSecondaryCta = (): { label: string; href: string } =>
  isFreeWeek()
    ? { label: 'See what people made', href: '/explore' }
    : { label: HERO.cta.secondary.label, href: '/auth/sign-up' }
