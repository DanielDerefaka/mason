'use client'

import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'

import { useDesignFonts } from '@/hooks/use-design-fonts'
import { useGoogleFont } from '@/hooks/use-google-font'
import { DESIGN_SCOPE, sanitiseHtml } from '@/lib/sanitise'
import { remixHref } from '@/lib/try/remix'
import { LogoMark } from '@/components/logo-mark'
import { api } from '../../../convex/_generated/api'
import { StyleGuideSchema } from '@/types/style-guide'

/**
 * Where both ways in point. `ref` rather than `utm_source`, on purpose: these
 * are internal hops, and a utm parameter on an internal link re-labels the
 * session — a visitor who arrived from X would be filed under the share page
 * from the next click on, in the one week the source report is read. A bare
 * ref rides along without touching the source. Whether Datafast shows it as a
 * row of its own is checked against the dashboard; if it ignores the
 * parameter, the fallback is a Convex signal.
 */
const TRY_HREF = '/try?ref=share'

/**
 * A design, to someone with no account.
 *
 * The same render path as the private preview — sanitised markup with the
 * guide's tokens bound — but reached with a token instead of a session. The
 * design has the page to itself; what is ours sits under it, where a reader
 * who has scrolled to the end of a screen is the reader who wants to know
 * how it was made.
 *
 * That bar is also the way in. Someone looking at a shared design has just
 * watched the thing work, which makes them the warmest visitor /try has —
 * and every link on this page used to end on the marketing home, where the
 * pitch starts again from the top. It used to be an 11px pill in the corner,
 * legible only to someone who went looking for it. Nothing about the viewing
 * changes: no session is minted to look, and none is spent.
 */
export const SharedDesign = ({ token }: { token: string }) => {
  const shared = useQuery(api.shares.getSharedDesign, { token })
  const recordOpen = useMutation(api.signals.recordShareOpen)

  /**
   * One of the three numbers the free week is judged on, counted here rather
   * than in the server render it used to sit in: a shared link is fetched by
   * X's card crawler, Slack's, and every preview bot in between, so the count
   * was mostly robots. A crawler does not run this.
   *
   * Guarded by a ref because strict mode runs effects twice, and best effort
   * because a design must never fail to appear over a counter.
   */
  const counted = useRef(false)
  useEffect(() => {
    if (counted.current) return
    counted.current = true
    void recordOpen({ token }).catch(() => undefined)
  }, [recordOpen, token])

  const guide = StyleGuideSchema.safeParse(shared?.styleGuide)
  const styleGuide = guide.success ? guide.data : null

  useGoogleFont(styleGuide?.typography.fontFamily, [300, 400, 500, 600, 700, 800])

  // A shared design is the one page here with no chrome around it, so a face
  // that does not arrive is the whole impression. The guide is often null on a
  // share, which left this rendering in Georgia on Windows.
  useDesignFonts(shared?.html)

  const cssVars = useMemo(() => {
    const vars: Record<string, string> = {}
    for (const section of styleGuide?.colorSections ?? []) {
      for (const swatch of section.swatches) vars[swatch.token] = swatch.color
    }
    if (styleGuide) vars['--font-family'] = styleGuide.typography.fontFamily
    return vars as React.CSSProperties
  }, [styleGuide])

  if (shared === undefined) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  }

  // Null covers both a token that never existed and one that has been revoked.
  // Saying which would confirm the guess.
  if (shared === null) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <LogoMark className="text-foreground mx-auto size-8" />
          <h1 className="mt-6 text-xl font-semibold">This link is no longer live</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            It may have been revoked, or the design may have been deleted.
          </p>
          <div className="mt-7 flex items-center justify-center gap-5 text-sm">
            <Link
              href={TRY_HREF}
              className="rounded-full bg-foreground px-4 py-2 font-medium text-background transition-opacity hover:opacity-90"
            >
              Try SketchMason free
            </Link>
            <Link href="/" className="text-sky-400 transition-opacity hover:opacity-80">
              What is SketchMason?
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ ...cssVars, background: 'var(--background)' }}
    >
      <div
        className={DESIGN_SCOPE}
        dangerouslySetInnerHTML={{ __html: sanitiseHtml(shared.html) }}
      />

      {/* Under the design, not over it, and in colours of its own: the
          design's tokens are bound on the root above, so `text-foreground`
          here would be whatever the design chose, on a background the design
          chose too. Every colour in the bar is literal. */}
      <footer className="border-t border-white/10 bg-[#0b0b0c] px-6 py-10 text-white md:py-12">
        <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-[0.8rem] text-white/60 transition-colors hover:text-white"
          >
            <LogoMark className="size-4" />
            Made with SketchMason
          </Link>
          <h2 className="mt-5 text-[1.5rem] font-medium tracking-[-0.02em] md:text-[1.75rem]">
            This started as a rough sketch.
          </h2>
          <p className="mt-3 max-w-[520px] text-[0.95rem] leading-relaxed text-white/70">
            Draw boxes, label them, and SketchMason builds the screen. No account needed.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={TRY_HREF}
              className="rounded-full bg-white px-5 py-2.5 text-[0.9rem] font-medium text-black transition-opacity hover:opacity-90"
            >
              Draw your own, free
            </Link>
            {/* Only when the owner put the design in Explore: a remix needs
                the sketch, which the gallery row holds and a share does not. */}
            {shared.remixId ? (
              <Link
                href={remixHref(shared.remixId)}
                className="rounded-full border border-white/20 px-5 py-2.5 text-[0.9rem] font-medium text-white transition-colors hover:bg-white/10"
              >
                Remix this design
              </Link>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  )
}
