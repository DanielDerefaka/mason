import { describe, expect, it } from 'vitest'

import {
  EMPTY_MARKER,
  TRUNCATION_MARKER,
  isUnusable,
  stripOutcomeMarkers,
  stripTruncationMarker,
  wasEmpty,
  wasTruncated,
} from './truncation'

import { sanitiseHtml } from './sanitise'

/**
 * The marker exists so a design that ran out of output tokens is reported as
 * cut off rather than saved as a design that came out badly. Its two
 * requirements pull in opposite directions: the client has to see it in the raw
 * stream, and the user must never see it on the page.
 */
describe('the truncation marker', () => {
  it('is detected in a stream that hit the output limit', () => {
    expect(wasTruncated(`<section>half a page${TRUNCATION_MARKER}`)).toBe(true)
  })

  it('is absent from a design that finished', () => {
    expect(wasTruncated('<section>a whole page</section>')).toBe(false)
  })

  it('is removed before the markup is stored', () => {
    const markup = `<p>Body</p>${TRUNCATION_MARKER}`
    const stripped = stripTruncationMarker(markup)

    expect(stripped).toBe('<p>Body</p>')
    expect(wasTruncated(stripped)).toBe(false)
  })

  it('does not survive the sanitiser, so it cannot reach a stored design', () => {
    // The property that lets it ride along in the raw stream safely. It was
    // not true when this test was written — the sanitiser walks elements, and
    // a comment is not one — so the sanitiser now drops comments outright.
    expect(sanitiseHtml(`<p>Body</p>${TRUNCATION_MARKER}`)).not.toContain('mason:truncated')
  })

  it('leaves markup that never carried it untouched', () => {
    const markup = '<section><h1>Title</h1></section>'
    expect(stripTruncationMarker(markup)).toBe(markup)
  })
})

/**
 * Found by auditing the running app: a generation returned 200 after twenty
 * seconds with an empty body. The stream had not errored, so the route's
 * refund path never ran — the credit was spent, and the canvas sat on
 * "Waiting for the first chunk" for a chunk that had already come and gone.
 *
 * Success and silence were indistinguishable. These are the tests that keep
 * them apart.
 */
describe('an empty generation', () => {
  it.each(['', '   ', '\n\n', '```html', '```html\n```', '<p></p>'])(
    'treats %j as nothing usable',
    (markup) => {
      expect(isUnusable(markup)).toBe(true)
    },
  )

  it('accepts a real fragment', () => {
    expect(
      isUnusable('<section style="padding:80px"><h1>Grow healthier plants</h1></section>'),
    ).toBe(false)
  })

  it('is detected from the marker the route appends', () => {
    expect(wasEmpty(`something${EMPTY_MARKER}`)).toBe(true)
    expect(wasEmpty('<section>a real design</section>')).toBe(false)
  })

  it('strips both outcome markers, so neither can reach a stored design', () => {
    const markup = `<p>Body</p>${TRUNCATION_MARKER}${EMPTY_MARKER}`
    const stripped = stripOutcomeMarkers(markup)

    expect(stripped).toBe('<p>Body</p>')
    expect(wasEmpty(stripped)).toBe(false)
    expect(wasTruncated(stripped)).toBe(false)
  })

  it('does not confuse a short-but-real design with an empty one', () => {
    // The threshold has to sit below anything a design could legitimately be.
    expect(isUnusable('<div style="height:100vh;background:#111"></div>')).toBe(false)
  })
})
