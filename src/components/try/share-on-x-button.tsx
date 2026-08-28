'use client'

import { Loader2 } from 'lucide-react'
import type { SVGProps } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import type { ShareOnX } from './use-share-on-x'

const XMark = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

/**
 * "Share on X (+2)". The bonus suffix only shows while a guest can still
 * earn it; afterwards, and for real users, it is a plain share. A disabled
 * button cannot receive pointer events, so the tooltip hangs off a span
 * around it — otherwise the reason it is disabled would never appear.
 */
export const ShareOnXButton = ({ share }: { share: ShareOnX }) => {
  const disabled = Boolean(share.disabledReason) || share.busy
  const button = (
    <Button
      size="sm"
      variant="ghost"
      className="rounded-full"
      disabled={disabled}
      onClick={() => void share.share()}
    >
      {share.busy ? <Loader2 className="size-3.5 animate-spin" /> : <XMark className="size-3.5" />}
      Share on X{share.earnsBonus ? ' (+2)' : ''}
    </Button>
  )

  if (!share.disabledReason) return button

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            {button}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{share.disabledReason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
