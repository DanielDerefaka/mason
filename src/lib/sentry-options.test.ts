import { describe, expect, it } from 'vitest'

import { sentryOptions } from './sentry-options'

/**
 * An error report is the one place a secret leaves the server without anyone
 * deciding to send it. A stack frame carries local variables, a failed request
 * carries its headers, and this app holds an Anthropic key, a Polar token, a
 * Convex deploy key and a webhook signing secret — none of which are worth a
 * bug report.
 *
 * These are written as leaks rather than as examples.
 */
const send = (event: unknown) =>
  JSON.stringify(sentryOptions.beforeSend(event as never, {} as never))

describe('scrubbing', () => {
  it.each([
    ['an Anthropic key', 'sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAA'],
    ['a gateway key', 'sk-KRg9AAAAAAAAAAAAAAAAAAAAAAAA'],
    ['a Polar token', 'polar_oat_AAAAAAAAAAAAAAAAAAAA'],
    ['a webhook secret', 'whsec_AAAAAAAAAAAAAAAAAAAAAAAA'],
    ['a JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r'],
  ])('redacts %s from a message', (_label, secret) => {
    const out = send({ message: `request failed with ${secret}` })
    expect(out).not.toContain(secret)
    expect(out).toContain('[redacted]')
  })

  it('redacts a secret nested deep in the event', () => {
    const out = send({
      exception: {
        values: [{ stacktrace: { frames: [{ vars: { key: 'sk-ant-api03-DEADBEEFDEADBEEF' } }] } }],
      },
    })
    expect(out).not.toContain('DEADBEEF')
  })

  it.each(['authorization', 'cookie', 'x-api-key', 'webhook-signature'])(
    'drops the %s header wholesale',
    (header) => {
      const out = send({ request: { headers: { [header]: 'Bearer something-private' } } })
      expect(out).not.toContain('something-private')
    },
  )

  it('is not fooled by casing on a header name', () => {
    expect(send({ request: { headers: { Authorization: 'Bearer private' } } })).not.toContain(
      'private',
    )
  })

  it('keeps everything that is not a secret, or the report is useless', () => {
    const out = send({
      message: 'generation failed after 224s',
      tags: { route: '/api/generate' },
      request: { headers: { 'content-type': 'application/json' } },
    })
    expect(out).toContain('generation failed after 224s')
    expect(out).toContain('/api/generate')
    expect(out).toContain('application/json')
  })

  it('survives a circular-free but deeply nested event without hanging', () => {
    let nested: Record<string, unknown> = { key: 'sk-ant-api03-DEEPDEEPDEEP' }
    for (let i = 0; i < 20; i += 1) nested = { nested }
    expect(() => send(nested)).not.toThrow()
  })
})

describe('defaults', () => {
  it('is disabled without a DSN, so a clone behaves as it always did', () => {
    // The suite runs with no NEXT_PUBLIC_SENTRY_DSN set.
    expect(sentryOptions.enabled).toBe(false)
  })

  it('does not record sessions, since this app holds unpublished work', () => {
    expect(sentryOptions.replaysSessionSampleRate).toBe(0)
    expect(sentryOptions.sendDefaultPii).toBe(false)
  })
})
