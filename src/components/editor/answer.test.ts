import { describe, expect, it } from 'vitest'

import { EMPTY_MARKER, TRUNCATION_MARKER } from '@/lib/truncation'
import { nodeAnswer } from './answer'

/**
 * The editor swapped in whatever the node route returned. A response cut off
 * at the output ceiling still parses to one valid element, so "Make this
 * responsive" on a whole page came back ending a third of the way down, the
 * footer and every later section gone, and the toast said "Applied".
 */
describe('nodeAnswer', () => {
  it('reads a cut-off element as truncated, so nothing is replaced', () => {
    expect(nodeAnswer(`<section>${TRUNCATION_MARKER}`)).toEqual({ kind: 'truncated' })
  })

  it('reads the empty marker as empty', () => {
    expect(nodeAnswer(EMPTY_MARKER)).toEqual({ kind: 'empty' })
  })

  it('returns a fenced fragment unfenced', () => {
    expect(nodeAnswer('```html\n<section><h1>A</h1></section>\n```')).toEqual({
      kind: 'ok',
      html: '<section><h1>A</h1></section>',
    })
  })

  it('returns a plain fragment as it is', () => {
    expect(nodeAnswer('<p>Body</p>')).toEqual({ kind: 'ok', html: '<p>Body</p>' })
  })
})
