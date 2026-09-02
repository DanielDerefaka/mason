'use client'

import { useEffect, useMemo } from 'react'

import { familiesInDesign, fontLinkId, googleFontHref, weightsInDesign } from '@/lib/design-fonts'

/**
 * Loads the faces a generated design names in its own stylesheet.
 *
 * Deliberately separate from `use-google-font`, which keeps one sheet for the
 * style guide's family and swaps it when the guide changes. A design names its
 * own faces, usually two, and on /try there is no guide at all: without this
 * the design renders in a fallback and the typography the model chose is never
 * seen. Sheets are keyed per family and stack, as on the canvas.
 *
 * Sheets are left in the head. A family that leaves the page is usually about
 * to come back, through an undo or the next generation, and a stylesheet costs
 * nothing once the browser has it.
 */
export const useDesignFonts = (html: string | null | undefined) => {
  const families = useMemo(() => familiesInDesign(html), [html])
  const weights = useMemo(() => weightsInDesign(html), [html])
  const key = families.join('|')
  const axis = weights.join(';')

  useEffect(() => {
    if (!key) return

    for (const family of key.split('|')) {
      const id = fontLinkId(family)
      if (document.getElementById(id)) continue

      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.dataset.designFont = family
      link.href = googleFontHref(
        family,
        axis.split(';').map(Number),
      )

      // css2 refuses a weight the family does not publish, and refuses the
      // whole sheet with it. Asking again without an axis gets the regular
      // weight of any hosted family, which is the difference between the
      // design's own face and Georgia.
      link.addEventListener(
        'error',
        () => {
          if (link.dataset.retried) {
            link.remove()
            return
          }
          link.dataset.retried = 'true'
          link.href = googleFontHref(family)
        },
        { once: false },
      )

      document.head.append(link)
    }
  }, [key, axis])

  return families
}
