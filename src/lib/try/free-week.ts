import { HERO } from '../marketing-content'

/**
 * The free-week switch, read on the server only.
 *
 * Deliberately not a NEXT_PUBLIC variable: the flag decides whether sign-up
 * is open and what the hero's second pill offers, and both of those are
 * rendered on the server. Inlining it into the client bundle would make
 * turning the week off a rebuild rather than an environment change. Client
 * components that need it (`SiteFooter`, `TryGuestGate`) take it as a prop
 * from the server component above them.
 *
 * What the switch does, in full: `src/app/auth/sign-up/layout.tsx` sends the
 * registration form to /try, the footer drops "Create account", the hero pill
 * below changes, and /try's exits say "accounts open soon" instead of
 * offering one. That is all. It does not close sign-in, it does not gate `/`,
 * and no call to action reads it (`CtaSection` is pinned not to). The week's
 * promise is that nothing *needs* an account, which is a fact about /try and
 * not a reason to lock out the accounts that already exist — and for a week
 * it did exactly that, because the redirect sat in the layout all three auth
 * screens share.
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
