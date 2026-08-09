'use client'

import { useEffect } from 'react'

/**
 * Loads every Google family currently in use on the canvas.
 *
 * Deliberately separate from `use-google-font`, which keeps exactly one
 * `<link data-style-guide-font>` in the head and swaps it when the guide
 * changes. Canvas text needs several families at once — two text shapes can
 * use different faces — so these links are keyed per family and stack.
 *
 * Inter is the app's own face and is skipped; asking Google for it would
 * fetch a second copy of a font already bundled.
 */
export const useCanvasFonts = (families: string[]) => {
  const key = [...new Set(families)].sort().join('|')

  useEffect(() => {
    const wanted = key.split('|').filter((family) => family && family !== 'Inter')

    for (const family of wanted) {
      const id = `canvas-font-${family.replace(/\s+/g, '-').toLowerCase()}`
      if (document.getElementById(id)) continue

      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.dataset.canvasFont = family
      link.href =
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}` +
        `:ital,wght@0,300..800;1,300..800&display=swap`
      document.head.append(link)
    }
    // Sheets are left in place: a family removed from the canvas is usually
    // about to come back (undo, or restyling another shape), and a stylesheet
    // link costs nothing once loaded.
  }, [key])
}
