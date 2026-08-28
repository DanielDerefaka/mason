import { Preloader } from '@/components/marketing/layout/Preloader'
import { RevealObserver } from '@/components/marketing/layout/RevealObserver'
import { SiteFooter } from '@/components/marketing/layout/SiteFooter'
import { SiteHeader } from '@/components/marketing/layout/SiteHeader'
import { SmoothScroll } from '@/components/marketing/layout/SmoothScroll'

/**
 * The public site.
 *
 * `marketing` is the class every design token is scoped to — the app and the
 * marketing pages share one Next app and one stylesheet, and only this subtree
 * gets the near-black surface, Inter body and Geist headings. The header is
 * sticky rather than fixed, so `main` needs no top padding.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing min-h-screen">
      <SmoothScroll />
      <Preloader />
      <RevealObserver />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
