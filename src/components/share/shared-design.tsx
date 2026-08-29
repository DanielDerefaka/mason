'use client'

import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'

import { useGoogleFont } from '@/hooks/use-google-font'
import { DESIGN_SCOPE, sanitiseHtml } from '@/lib/sanitise'
import { LogoMark } from '@/components/logo-mark'
import { api } from '../../../convex/_generated/api'
import { StyleGuideSchema } from '@/types/style-guide'

/**
 * A design, to someone with no account.
 *
 * The same render path as the private preview — sanitised markup with the
 * guide's tokens bound — but reached with a token instead of a session. The
 * only thing of ours on the page is a small pill in the corner, because the
 * point of sending someone a link is that they see the design.
 *
 * The pill is also the way in. Someone looking at a shared design has just
 * watched the thing work, which makes them the warmest visitor /try has —
 * and every link on this page used to end on the marketing home, where the
 * pitch starts again from the top. Nothing about the viewing changes: no
 * session is minted to look, and none is spent.
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
              href="/try"
              className="rounded-full bg-foreground px-4 py-2 font-medium text-background transition-opacity hover:opacity-90"
            >
              Try Mason free
            </Link>
            <Link href="/" className="text-sky-400 transition-opacity hover:opacity-80">
              What is Mason?
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

      {/* Legible at rest, where it used to sit at 40% until hovered: a way in
          that has to be hovered to be read is not a way in. Still small, still
          in the corner, still over the design rather than in it. */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center overflow-hidden rounded-full bg-black/75 text-[11px] text-white/80 backdrop-blur">
        <Link
          href="/"
          title="Made with Mason"
          className="flex items-center gap-2 py-2 pr-2.5 pl-3 transition-colors hover:text-white"
        >
          <LogoMark className="size-3.5" />
          Made with Mason
        </Link>
        <Link
          href="/try"
          className="border-l border-white/15 py-2 pr-3 pl-2.5 font-medium text-white transition-colors hover:bg-white/10"
        >
          Try Mason free
        </Link>
      </div>
    </div>
  )
}
