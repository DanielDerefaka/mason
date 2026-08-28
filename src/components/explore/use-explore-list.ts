'use client'

import { useQueries } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { useCallback, useMemo, useState } from 'react'

import { api } from '../../../convex/_generated/api'

export type ExplorePage = FunctionReturnType<typeof api.explore.list>
export type ExploreItem = ExplorePage['items'][number]

/** Twelve is three rows of the three-column grid: enough to read as a gallery. */
const PAGE_SIZE = 12

/**
 * The gallery, one page at a time.
 *
 * `api.explore.list` takes a cursor and hands back the next one, which is not
 * the `paginationOpts` shape `usePaginatedQuery` insists on. So the pages are
 * kept by hand: one cursor per page fetched so far, all of them subscribed at
 * once through `useQueries`. That keeps every page live — a design published
 * while someone is looking appears at the top without a reload — and makes
 * "Load more" nothing more than pushing a cursor.
 */
export const useExploreList = () => {
  const [cursors, setCursors] = useState<Array<string | null>>([null])

  const results = useQueries(
    useMemo(
      () =>
        Object.fromEntries(
          cursors.map((cursor, index) => [
            String(index),
            { query: api.explore.list, args: { cursor, limit: PAGE_SIZE } },
          ]),
        ),
      [cursors],
    ),
  )

  const { pages, items } = useMemo(() => {
    const pages = cursors.map(
      (_, index) => results[String(index)] as ExplorePage | Error | undefined,
    )

    // Deduplicated by id. The first page is live, so a design published after
    // page two was fetched pushes the old twelfth card across the boundary —
    // it would otherwise be drawn once in each page.
    const seen = new Set<string>()
    const items: ExploreItem[] = []
    for (const page of pages) {
      if (!page || page instanceof Error) continue
      for (const item of page.items) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        items.push(item)
      }
    }
    return { pages, items }
  }, [results, cursors])

  const first = pages[0]
  const last = pages[pages.length - 1]
  const error = pages.find((page): page is Error => page instanceof Error) ?? null

  const nextCursor = last && !(last instanceof Error) ? last.nextCursor : null

  const loadMore = useCallback(() => {
    if (!nextCursor) return
    setCursors((current) => (current.includes(nextCursor) ? current : [...current, nextCursor]))
  }, [nextCursor])

  const status: 'loading' | 'error' | 'ready' =
    error ? 'error' : first === undefined ? 'loading' : 'ready'

  return {
    status,
    error,
    items,
    hasMore: nextCursor !== null,
    loadingMore: pages.length > 1 && last === undefined,
    loadMore,
  }
}
