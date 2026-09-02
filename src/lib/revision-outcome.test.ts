import { describe, expect, it } from 'vitest'

import { revisionOutcome } from './revision-outcome'
import { EMPTY_MARKER, TRUNCATION_MARKER } from './truncation'

/**
 * The canvas chat used to store whatever the revise route streamed and say
 * "Done". The route's two outcome markers are HTML comments, which the
 * sanitiser drops, so an empty answer became a blank shape and a cut-off one
 * became half a page, each replacing a design that had been fine. These pin
 * the three readings of a finished stream.
 */
describe('revisionOutcome', () => {
  it('reads the empty marker as nothing to keep', () => {
    expect(revisionOutcome(EMPTY_MARKER)).toEqual({ kind: 'empty' })
  })

  it('treats a blank body the same way, so an older route cannot blank a design either', () => {
    expect(revisionOutcome('  \n')).toEqual({ kind: 'empty' })
  })

  it('reads the truncation marker as a partial design, with the marker removed', () => {
    const outcome = revisionOutcome(`<section>half a page${TRUNCATION_MARKER}`)

    expect(outcome).toEqual({ kind: 'truncated', html: '<section>half a page' })
  })

  it('passes a finished design through untouched', () => {
    const html = '<section><h1>Grow healthier plants</h1></section>'

    expect(revisionOutcome(html)).toEqual({ kind: 'ok', html })
  })
})
