'use client'

import Link from 'next/link'

import { ExploreCard, ExploreCardSkeleton } from './card'
import { useExploreList } from './use-explore-list'

/** Six placeholders: two rows of the widest grid, so the page has a shape before it has data. */
const SKELETON_COUNT = 6

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
)

/**
 * The public gallery.
 *
 * Client-rendered, because every card sanitises its design with the
 * browser's own parser — there is no server-side render of a card, and so
 * nothing here may carry `.reveal`: the observer that lights that class
 * scans on navigation, before these cards exist, and would leave them at
 * opacity 0.
 */
export const ExploreGallery = () => {
  const { status, items, hasMore, loadingMore, loadMore } = useExploreList()

  if (status === 'loading') {
    return (
      <Grid>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <ExploreCardSkeleton key={index} />
        ))}
      </Grid>
    )
  }

  if (status === 'error') {
    return (
      <div role="alert" className="card-surface px-6 py-10 text-center">
        <p className="text-foreground text-[1rem] font-medium">Explore is not loading right now.</p>
        <p className="text-muted-foreground mt-2 text-[0.92rem]">Try again in a minute.</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="card-surface flex flex-col items-center px-6 py-14 text-center">
        <h2 className="font-display text-foreground text-[1.4rem] font-medium tracking-[-0.03em]">
          Nothing here yet
        </h2>
        <p className="text-muted-foreground mt-3 max-w-[420px] text-[0.95rem] leading-relaxed">
          The gallery fills up as people draw. Every design on it starts as a rough sketch —
          yours could be the first one today.
        </p>
        <Link href="/try" className="pill pill-primary mt-7">
          Try SketchMason free <span aria-hidden>→</span>
        </Link>
      </div>
    )
  }

  return (
    <>
      <Grid>
        {items.map((item) => (
          <ExploreCard key={item.id} item={item} />
        ))}
      </Grid>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="pill pill-secondary disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}
