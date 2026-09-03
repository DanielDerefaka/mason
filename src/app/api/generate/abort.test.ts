import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The regression this exists for: the page route never looked at
 * `request.signal`, so a closed tab left the model writing the whole page to
 * no one for up to five minutes on the house key, and whether the charge
 * came back turned on whether a chunk happened to arrive after the socket
 * went. The route needs a running model to exercise, so this reads it.
 */
describe('the page route stops when the reader goes', () => {
  const source = readFileSync(join(process.cwd(), 'src/app/api/generate/route.ts'), 'utf8')

  it('hands the model call an abort signal wired to the request', () => {
    expect(source).toMatch(/request\.signal\.addEventListener\('abort', \(\) => upstream\.abort\(\)/)
    expect(source).toMatch(/abortSignal: upstream\.signal/)
  })

  it('aborts on the stream being cancelled too, whichever the runtime fires first', () => {
    expect(source).toMatch(/cancel\(\) \{[\s\S]*?upstream\.abort\(\)/)
  })

  it('refunds an abort only when nothing usable was produced', () => {
    // A refund on every abort would let a guest replay the day's one pool
    // turn by hanging up late, with the page kept each time.
    expect(source).toMatch(/const refunded = isUnusable\(produced\)\n\s+if \(refunded\) await refundCredit\(\)/)
  })

  it('does not treat the reader leaving as the model failing', () => {
    expect(source).toMatch(/if \(!gone\(\)\) \{/)
  })
})
