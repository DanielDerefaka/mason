import { describe, expect, it } from 'vitest'

import {
  MAX_FAMILIES,
  familiesInDesign,
  fontLinkId,
  googleFontHref,
  headFamily,
  weightsInDesign,
} from './design-fonts'

/**
 * What shipped broken: nothing fetched the faces a design named.
 *
 * `useGoogleFont` is handed `styleGuide?.typography.fontFamily`, and on /try
 * there is no style guide, so it was handed undefined on every generation a
 * first-time visitor ever made. The design's own stylesheet asked for Playfair
 * Display and got Didot on a Mac and Georgia on Windows, and the second is what
 * most visitors saw. These read the names back out of the markup so something
 * can go and get them.
 */
describe('familiesInDesign', () => {
  it('reads a family out of a stylesheet', () => {
    const html = `<style>.hero h1 { font-family: 'Playfair Display', serif; }</style><h1>Hi</h1>`
    expect(familiesInDesign(html)).toEqual(['Playfair Display'])
  })

  it('reads a family out of an inline style attribute', () => {
    const html = `<h1 style="font-family: 'Instrument Serif', serif; font-size: 64px">Hi</h1>`
    expect(familiesInDesign(html)).toEqual(['Instrument Serif'])
  })

  // A quoted two-word family inside a style attribute ends at the closing
  // quote of the attribute, not at a semicolon or a brace. One regex over the
  // whole document got this wrong and returned `Bodoni Moda", serif`.
  it('does not swallow the attribute quote', () => {
    const html = `<p style="font-family: 'Bodoni Moda', serif">Hi</p>`
    expect(familiesInDesign(html)).toEqual(['Bodoni Moda'])
  })

  it('takes only the head of a stack', () => {
    const html = `<style>body { font-family: Manrope, Inter, system-ui, sans-serif; }</style>`
    expect(familiesInDesign(html)).toEqual(['Manrope'])
  })

  it('keeps the order the design first mentions them in', () => {
    const html = `<style>
      h1 { font-family: 'Fraunces', serif; }
      body { font-family: 'Space Grotesk', sans-serif; }
      h2 { font-family: 'Playfair Display', serif; }
    </style>`
    expect(familiesInDesign(html)).toEqual(['Space Grotesk', 'Playfair Display'])
  })

  /**
   * The application carries Inter and Fraunces through `next/font`, so on a
   * screen they are already there. A downloaded file is opened outside the
   * application, where nothing is: the export asks for them by name.
   */
  it('links a bundled face only for a caller that has no next/font', () => {
    const html = `<style>h1 { font-family: 'Fraunces', serif }</style>`
    expect(familiesInDesign(html)).toEqual([])
    expect(familiesInDesign(html, { includeBundled: true })).toEqual(['Fraunces'])
  })

  it('never asks Google for a face the browser already has', () => {
    const html = `<style>
      body { font-family: system-ui; }
      .a { font-family: Helvetica; }
      .b { font-family: Georgia, serif; }
      .c { font-family: monospace; }
      .d { font-family: Inter, sans-serif; }
    </style>`
    expect(familiesInDesign(html)).toEqual([])
  })

  // `var(--font-family)` is the style guide's, and `useGoogleFont` has it. A
  // request for a family literally called "var(--font-family)" 400s.
  it('leaves the guide variable to the guide', () => {
    const html = `<style>body { font-family: var(--font-family); }</style>`
    expect(familiesInDesign(html)).toEqual([])
  })

  it('is case insensitive about duplicates', () => {
    const html = `<style>
      h1 { font-family: 'Playfair Display', serif; }
      h2 { FONT-FAMILY: "playfair display", serif; }
    </style>`
    expect(familiesInDesign(html)).toEqual(['Playfair Display'])
  })

  // Every family is a render-blocking stylesheet on somebody's first visit,
  // and a design naming six faces is improvising rather than pairing.
  it('stops at the cap', () => {
    const html = `<style>${['A', 'B', 'C', 'D', 'E', 'F']
      .map((name, index) => `.n${index} { font-family: '${name} Sans'; }`)
      .join('')}</style>`
    expect(familiesInDesign(html)).toHaveLength(MAX_FAMILIES)
  })

  it('has nothing to say about nothing', () => {
    expect(familiesInDesign(null)).toEqual([])
    expect(familiesInDesign(undefined)).toEqual([])
    expect(familiesInDesign('<p>No styles here</p>')).toEqual([])
  })
})

describe('weightsInDesign', () => {
  it('asks for the weights the design sets', () => {
    const html = `<style>h1 { font-weight: 600 } p { font-weight: 300 }</style>`
    expect(weightsInDesign(html)).toEqual([300, 400, 600])
  })

  // A browser synthesising bold out of one weight is the tell of a page built
  // in a hurry, and it is what a design that never says otherwise would get.
  it('adds a bold when the design names one weight', () => {
    expect(weightsInDesign('<p>Nothing</p>')).toEqual([400, 700])
  })

  // css2 refuses a weight it does not recognise, and refuses the whole sheet
  // with it, so an invented weight has to be dropped rather than passed on.
  it('drops a weight Google does not publish', () => {
    expect(weightsInDesign('<style>h1{font-weight:650}h2{font-weight:700}</style>')).toEqual([
      400, 700,
    ])
  })
})

describe('googleFontHref', () => {
  it('spells a two-word family the way css2 wants it', () => {
    expect(googleFontHref('Playfair Display', [400, 700])).toBe(
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap',
    )
  })

  // The fallback the hook retries with. css2 answers this for every family it
  // hosts, whatever weights that family happens to publish, which is the
  // difference between the design's own face and Georgia.
  it('asks for no axis at all when given no weights', () => {
    expect(googleFontHref('Fraunces')).toBe(
      'https://fonts.googleapis.com/css2?family=Fraunces&display=swap',
    )
  })
})

describe('headFamily', () => {
  it('unquotes and takes the first', () => {
    expect(headFamily(`"Bodoni Moda", Didot, serif`)).toBe('Bodoni Moda')
    expect(headFamily('Inter')).toBe('Inter')
  })
})

describe('fontLinkId', () => {
  it('is stable and safe as an element id', () => {
    expect(fontLinkId('Playfair Display')).toBe('design-font-playfair-display')
    expect(fontLinkId('IBM Plex Mono')).toBe(fontLinkId('ibm plex mono'))
  })
})
