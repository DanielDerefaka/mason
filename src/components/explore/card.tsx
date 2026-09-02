'use client'

import { formatDistanceToNow } from 'date-fns'
import { Check, Copy, GitFork } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Skeleton } from '@/components/ui/skeleton'
import { DESIGN_SCOPE, designScope, sanitiseHtml } from '@/lib/sanitise'
import { remixHref } from '@/lib/try/remix'
import type { ExploreItem } from './use-explore-list'

/**
 * The width a design is drawn at before it is scaled into the card — a real
 * page width, so the card shows the design's own proportions rather than a
 * narrow-viewport reflow of it.
 */
const DESIGN_WIDTH = 1280

/**
 * A design's own tokens, resolved for a white surface.
 *
 * The card sits inside the marketing tree, whose tokens are light text on
 * near-black. A design that refers to `var(--foreground)` would paint white
 * on the card's white surface, so the preview rebinds the handful a style
 * guide sets to sensible light-surface values. Designs with their colours
 * inlined never look these up.
 */
const SURFACE_TOKENS = {
  '--background': '#ffffff',
  '--foreground': '#0a0a0a',
  '--card': '#ffffff',
  '--card-foreground': '#0a0a0a',
  '--muted': '#f5f5f5',
  '--muted-foreground': '#525252',
  '--border': '#e5e5e5',
  '--primary': '#0a0a0a',
  '--primary-foreground': '#ffffff',
  '--secondary': '#f5f5f5',
  '--secondary-foreground': '#0a0a0a',
  '--accent': '#f5f5f5',
  '--accent-foreground': '#0a0a0a',
} as React.CSSProperties

const remixCount = (remixes: number) =>
  remixes === 1 ? '1 remix' : `${remixes} remixes`

export const ExploreCard = ({ item }: { item: ExploreItem }) => {
  const frame = useRef<HTMLDivElement | null>(null)
  const design = useRef<HTMLDivElement | null>(null)
  const [copied, setCopied] = useState(false)

  // A scope of this card's own. Every design here was written as if it owned
  // the page, and the gallery shows twenty of them at once: under the shared
  // class each one's stylesheet reached into all the others.
  const scope = designScope(item.id)

  // Sanitised once per card, not per render: the walk parses the whole design.
  const preview = useMemo(() => sanitiseHtml(item.html, scope), [item.html, scope])

  useEffect(() => {
    const frameNode = frame.current
    const designNode = design.current
    if (!frameNode || !designNode) return

    // The scale is written straight to the node rather than kept in state: it
    // is layout, not data, and re-rendering a sanitised design on every
    // resize would be paying for a parse to move a transform.
    const fit = () => {
      designNode.style.transform = `scale(${frameNode.clientWidth / DESIGN_WIDTH})`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(frameNode)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copyInstruction = async () => {
    if (!item.instruction) return
    try {
      await navigator.clipboard.writeText(item.instruction)
      setCopied(true)
      toast.success('Instruction copied')
    } catch {
      // No clipboard on an insecure origin or a denied permission; the text is
      // on the card, so say so rather than fail silently.
      toast.error('Could not copy', { description: 'Select the text instead' })
    }
  }

  return (
    <article className="card-surface card-surface-hover flex flex-col overflow-hidden">
      <div
        ref={frame}
        className="relative aspect-[4/3] overflow-hidden bg-white"
        style={SURFACE_TOKENS}
      >
        {/* A picture of a design, not the design: nothing in it is reachable
            by pointer or by a screen reader, and the card's controls sit
            below it. The initial scale is a guess for the first paint; the
            observer corrects it as soon as the card has a width. */}
        <div
          ref={design}
          aria-hidden
          className={`${DESIGN_SCOPE} ${scope} pointer-events-none absolute top-0 left-0 origin-top-left select-none`}
          style={{ width: DESIGN_WIDTH, transform: 'scale(0.25)' }}
          dangerouslySetInnerHTML={{ __html: preview }}
        />

        {item.sketchUrl && (
          /* The drawing this came from. A plain <img>: the URL is a Convex
             storage URL that changes per deployment, and next/image would
             want each host listed in advance. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.sketchUrl}
            alt="The sketch this design was made from"
            title="The sketch"
            loading="lazy"
            className="absolute bottom-2 left-2 h-14 w-auto max-w-[45%] rounded-md border border-black/10 bg-white object-contain shadow-[0_2px_10px_rgba(0,0,0,0.18)]"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-foreground truncate text-[1rem] font-medium tracking-[-0.02em]">
            {item.label}
          </h3>
          <time
            dateTime={new Date(item.createdAt).toISOString()}
            className="text-faint shrink-0 text-[12px]"
          >
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </time>
        </div>

        {item.instruction ? (
          <div className="flex items-start gap-2">
            <p
              className="text-muted-foreground line-clamp-2 flex-1 text-[13.5px] leading-relaxed"
              title={item.instruction}
            >
              {item.instruction}
            </p>
            <button
              type="button"
              onClick={() => void copyInstruction()}
              aria-label="Copy the instruction"
              title="Copy the instruction"
              className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1.5 transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:outline-none"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        ) : (
          <p className="text-faint text-[13.5px] leading-relaxed italic">
            Drawn without a description.
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
            <GitFork className="size-3.5" aria-hidden />
            {remixCount(item.remixes)}
          </span>
          <Link
            href={remixHref(item.id)}
            className="pill pill-primary px-4 py-1.5 text-[13px]"
            aria-label={`Remix ${item.label}`}
          >
            Remix
          </Link>
        </div>
      </div>
    </article>
  )
}

/** The card's silhouette, shown while the first page is on its way. */
export const ExploreCardSkeleton = () => (
  <div className="card-surface overflow-hidden" aria-hidden>
    <Skeleton className="aspect-[4/3] rounded-none" />
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  </div>
)
