'use client'

import { useParams, usePathname } from 'next/navigation'

/**
 * Where the canvas, editor and preview live for the page we are on.
 *
 * The dashboard nests them under a session segment; /try is flat. Every link
 * between the three used to hardcode `/dashboard/${session}`, which is right
 * for the dashboard and sends a guest to a page that redirects them straight
 * back. Outside /try this returns exactly the string those links built
 * before, `session` and all, so nothing about the dashboard changes.
 */
export const useWorkspacePath = (): string => {
  const pathname = usePathname()
  const { session } = useParams<{ session?: string }>()
  return pathname?.startsWith('/try') ? '/try' : `/dashboard/${session}`
}

/**
 * The canvas is the one page whose path differs in shape: `/try` is the
 * canvas itself, where the dashboard has a `/canvas` segment.
 */
export const canvasPathOf = (workspace: string): string =>
  workspace === '/try' ? workspace : `${workspace}/canvas`
