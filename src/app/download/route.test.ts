import { describe, expect, it } from 'vitest'

import { GET } from './route'

/**
 * The regression this exists for: /download was pulled and answered 404 with
 * a pretty not-found page. Google kept the sitelink "Download | Mason" on the
 * brand result, because a 404 is "not here today". 410 is the signal that
 * drops it.
 */
describe('/download', () => {
  it('answers 410 with noindex, not a 404 page', () => {
    const response = GET()
    expect(response.status).toBe(410)
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(response.headers.get('content-type')).toMatch(/text\/plain/)
  })
})
