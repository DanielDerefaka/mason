'use client'

import { useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

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
 * only thing of ours on the page is a small mark in the corner, because the
 * point of sending someone a link is that they see the design.
 */
export const SharedDesign = ({ token }: { token: string }) => {
  const shared = useQuery(api.shares.getSharedDesign, { token })

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
          <Link
            href="/"
            className="mt-7 inline-block text-sm text-sky-400 transition-opacity hover:opacity-80"
          >
            What is Mason?
          </Link>
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

      <Link
        href="/"
        title="Made with Mason"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-[11px] text-white/80 opacity-40 backdrop-blur transition-opacity hover:opacity-100"
      >
        <LogoMark className="size-3.5" />
        Made with Mason
      </Link>
    </div>
  )
}
