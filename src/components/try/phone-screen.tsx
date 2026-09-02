'use client'

import { Check, Compass, Link2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { LogoMark } from '@/components/logo-mark'
import { Button } from '@/components/ui/button'

/**
 * What a phone gets instead of the canvas.
 *
 * Half of paid and social traffic arrives on a phone, and until this screen
 * existed every one of those visits opened a desktop canvas a finger cannot
 * draw on, read a first-run hint that said "press F", and spent one of the
 * network's daily guest sessions doing it. The shell decides before the gate
 * mounts, so this screen costs the network nothing.
 *
 * Two ways on: the link, to carry to a machine that can draw, and Explore,
 * the one part of the product that works at this width. The address is
 * copied whole, query string and all, so a remix or a ref survives the trip.
 * Where the clipboard is refused, and on a phone it often is, the address is
 * shown in a field to be selected and copied by hand, rather than a button
 * that looked pressed and did nothing.
 */
export const PhoneScreen = () => {
  const [copied, setCopied] = useState(false)
  const [fallback, setFallback] = useState<string | null>(null)

  const copyLink = async () => {
    const href = window.location.href
    try {
      await navigator.clipboard.writeText(href)
      setCopied(true)
    } catch {
      setFallback(href)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="size-8 text-muted-foreground" />
      <p className="text-base font-medium">Mason draws best on a desktop</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Open this page on a bigger screen, or look at what people made.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" className="rounded-full px-4" onClick={() => void copyLink()}>
          {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
        <Button asChild size="sm" variant="secondary" className="rounded-full px-4">
          <Link href="/explore">
            <Compass className="size-3.5" />
            Browse Explore
          </Link>
        </Button>
      </div>
      {fallback && (
        <label className="flex w-full max-w-sm flex-col gap-1.5 text-xs text-muted-foreground">
          Copying is blocked here. Select the address and copy it yourself.
          <input
            readOnly
            value={fallback}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1.5 font-mono text-[11px] text-foreground"
          />
        </label>
      )}
    </div>
  )
}
