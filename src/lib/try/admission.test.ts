import { describe, expect, it } from 'vitest'

import { hashIp, signAdmission, verifyAdmission } from './admission'

/**
 * The token is the only thing standing between "anyone" and "ten guest
 * sessions per network per day", and it crosses the browser on its way to
 * Convex. These are written as the forgeries someone would try.
 */
const SECRET = 'test-secret-that-is-not-real'
const NOW = 1_700_000_000_000

describe('an admission token', () => {
  it('round-trips the payload it was signed with', async () => {
    const admission = { ipHash: 'abc123', exp: NOW + 60_000 }
    const token = await signAdmission(admission, SECRET)
    expect(await verifyAdmission(token, SECRET, NOW)).toEqual(admission)
  })

  it('is two unpadded base64url segments, so both runtimes read it the same way', async () => {
    const token = await signAdmission({ ipHash: 'abc123', exp: NOW + 60_000 }, SECRET)
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(token).not.toContain('=')
  })

  it('is refused once its payload has been altered', async () => {
    const token = await signAdmission({ ipHash: 'abc123', exp: NOW + 60_000 }, SECRET)
    const [, signature] = token.split('.')
    // A forged payload claiming a different network, under the real signature.
    const forgedPayload = btoa(JSON.stringify({ ipHash: 'someone-else', exp: NOW + 60_000 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(await verifyAdmission(`${forgedPayload}.${signature}`, SECRET, NOW)).toBeNull()
  })

  it('is refused once it has expired', async () => {
    const token = await signAdmission({ ipHash: 'abc123', exp: NOW + 60_000 }, SECRET)
    expect(await verifyAdmission(token, SECRET, NOW + 60_000)).toBeNull()
    expect(await verifyAdmission(token, SECRET, NOW + 120_000)).toBeNull()
  })

  it('is refused under a different secret', async () => {
    const token = await signAdmission({ ipHash: 'abc123', exp: NOW + 60_000 }, SECRET)
    expect(await verifyAdmission(token, 'another-secret', NOW)).toBeNull()
  })

  it.each([
    ['nothing', ''],
    ['one segment', 'abc'],
    ['three segments', 'a.b.c'],
    ['a dot with nothing either side', '.'],
    ['characters outside base64url', 'ab+/cd.ef=='],
    ['a signature of the wrong length', 'eyJhIjoxfQ.AAAA'],
    ['a payload that is not JSON', 'bm90LWpzb24.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
  ])('is refused when it is garbage: %s', async (_label, token) => {
    expect(await verifyAdmission(token, SECRET, NOW)).toBeNull()
  })

  it('is refused when the payload is well-signed but the wrong shape', async () => {
    // Signed with the real secret, so only the shape check can catch it.
    const token = await signAdmission({ ipHash: 42, exp: 'soon' } as never, SECRET)
    expect(await verifyAdmission(token, SECRET, NOW)).toBeNull()
  })
})

describe('hashing an address', () => {
  it('never contains the address it was made from', async () => {
    const hash = await hashIp('203.0.113.7', SECRET)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain('203.0.113.7')
  })

  it('is stable for one address and different for another', async () => {
    expect(await hashIp('203.0.113.7', SECRET)).toBe(await hashIp('203.0.113.7', SECRET))
    expect(await hashIp('203.0.113.7', SECRET)).not.toBe(await hashIp('203.0.113.8', SECRET))
  })

  it('depends on the secret, so a table of hashes cannot be reversed from outside', async () => {
    expect(await hashIp('203.0.113.7', SECRET)).not.toBe(await hashIp('203.0.113.7', 'other'))
  })
})
