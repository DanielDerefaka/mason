import { describe, expect, it } from 'vitest'

import { TRUNCATION_MARKER, stripTruncationMarker, wasTruncated } from './truncation'

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
