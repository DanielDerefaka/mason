import { Preloader } from '@/components/marketing/layout/Preloader'
import { SiteFooter } from '@/components/marketing/layout/SiteFooter'
import { SiteHeader } from '@/components/marketing/layout/SiteHeader'
import { SmoothScroll } from '@/components/marketing/layout/SmoothScroll'
import { ThemeProvider } from '@/components/marketing/layout/ThemeProvider'

/**
 * The public site.
 *
 * `marketing` is the class every design token is scoped to — the app and the
 * marketing pages share one Next app and one stylesheet, and only this subtree
 * gets the near-black surfaces and the display face.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="marketing min-h-screen font-sans">
        <SmoothScroll />
        <Preloader />
        <SiteHeader />
        <main className="pt-[72px]">{children}</main>
        <SiteFooter />
      </div>
    </ThemeProvider>
  )
}
