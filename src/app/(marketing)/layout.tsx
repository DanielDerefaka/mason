import { Preloader } from '@/components/marketing/layout/Preloader'
import { RevealObserver } from '@/components/marketing/layout/RevealObserver'
import { SiteFooter } from '@/components/marketing/layout/SiteFooter'
import { SiteHeader } from '@/components/marketing/layout/SiteHeader'
import { SmoothScroll } from '@/components/marketing/layout/SmoothScroll'
import { isFreeWeek } from '@/lib/try/free-week'

/**
 * The public site.
 *
 * `marketing` is the class every design token is scoped to — the app and the
 * marketing pages share one Next app and one stylesheet, and only this subtree
 * gets the near-black surface, Inter body and Geist headings. The header is
 * sticky rather than fixed, so `main` needs no top padding.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Read here, on the server, and threaded down as a prop: the header and
  // footer are client components and must not read the env themselves.
  const freeWeek = isFreeWeek()

  return (
    <div className="marketing min-h-screen" suppressHydrationWarning>
      {/* Turns on the scroll-in animation only for browsers that run JS.
          Without this class, `.reveal` stays fully visible, which is what a
          crawler that never executes script needs.

          The script runs while the HTML is still being parsed, so by the time
          React hydrates, the div already carries a class React never rendered.
          That is the one attribute mismatch this tree is meant to have;
          `suppressHydrationWarning` on the div (it covers that element only)
          keeps React from reporting it as a hydration error on every marketing
          page, which is what `smoke:browser` was failing `/` and `/explore` on. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.currentScript&&document.currentScript.parentElement&&document.currentScript.parentElement.classList.add('reveal-js')`,
        }}
      />
      <SmoothScroll />
      <Preloader />
      <RevealObserver />
      <SiteHeader freeWeek={freeWeek} />
      <main>{children}</main>
      <SiteFooter freeWeek={freeWeek} />
    </div>
  )
}
