import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'

import { GUEST_IP_CAP, refusalFrom, refusalFromSignIn } from './guest-refusal'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

/**
 * Comments in this repository explain why a thing is *not* done, so a scan for
 * an absence matches the explanation and passes for the wrong reason. Same
 * helper, and same lesson, as `src/app/metadata.test.ts`.
 */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('classifying a refused guest sign-in', () => {
  /**
   * The regression this exists for: the cap threw a plain `Error`, which
   * Convex masks as "[Request ID: …] Server Error" by the time the browser
   * sees it. /try could not tell a rule from a fault, so it showed "Mason is
   * busy — try again in a minute" to someone whose network was capped until
   * midnight UTC. The refresh it offered could not work, and during a free
   * week that screen is an office full of people reading a working product as
   * a broken one.
   */
  it('recognises the cap through a ConvexError, which crosses the wire unmasked', () => {
    expect(refusalFrom(new ConvexError(GUEST_IP_CAP))).toBe('network-cap')
  })

  it('recognises it by shape, since the client rebuilds the error rather than the class', () => {
    expect(refusalFrom({ data: GUEST_IP_CAP })).toBe('network-cap')
  })

  it.each([
    ['a masked server error', new Error('[Request ID: abc] Server Error')],
    ['a dropped request', new TypeError('Failed to fetch')],
    ['some other ConvexError', new ConvexError('something else')],
    ['nothing at all', undefined],
    ['null', null],
  ])('treats %s as unknown, which keeps the "try again" wording', (_label, error) => {
    expect(refusalFrom(error)).toBe('unknown')
  })
})

describe('how a refusal reaches the browser', () => {
  /**
   * The regression this exists for, and it shipped. The cap threw a
   * ConvexError so that `data` would survive Convex's masking — and it does,
   * inside Convex. It does not reach the browser: in the Next integration
   * `signIn` posts to /api/auth, and that proxy catches the error and forwards
   * `{ error: error.message }` with a 400. `data` is dropped, the message is
   * the masked one, and the client rebuilds a plain Error from it. Classifying
   * the throw could therefore only ever return 'unknown', which is exactly
   * what a capped network saw in production.
   *
   * So the refusal travels as an absence: `authorize` returns null, the
   * library reports a sign-in that produced no tokens, and that crosses the
   * proxy as an ordinary 200.
   */
  it('reads a sign-in that produced no tokens as the cap', () => {
    expect(refusalFromSignIn({ signingIn: false })).toBe('network-cap')
  })

  it('lets a real sign-in through', () => {
    expect(refusalFromSignIn({ signingIn: true })).toBe(null)
  })

  it.each([[undefined], [{}]])('treats %s as refused rather than as success', (result) => {
    expect(refusalFromSignIn(result)).toBe('network-cap')
  })

  it('is what the hook actually calls, not the classifier that cannot work there', () => {
    const hook = withoutComments(read('src/components/try/use-guest-session.ts'))
    expect(hook).toMatch(/refusalFromSignIn\(await signIn\(/)
  })

  it('is declined in the provider, so nothing is left to throw across the proxy', () => {
    const auth = withoutComments(read('convex/auth.ts'))
    expect(auth).toMatch(/if \(refusalFrom\(error\) === 'network-cap'\) return null/)
    // Anything that is not the cap is a fault and must keep travelling.
    expect(auth).toMatch(/throw error/)
  })
})

describe('the code the client reads is the code the mutation throws', () => {
  const guest = read('convex/guest.ts')

  it('is one constant, imported across the boundary rather than spelled twice', () => {
    expect(guest).toMatch(/from '\.\.\/src\/lib\/try\/guest-refusal'/)
    expect(guest).toMatch(/throw new ConvexError\(GUEST_IP_CAP\)/)
  })

  it('is no longer thrown as a plain Error, which Convex would mask', () => {
    expect(withoutComments(guest)).not.toMatch(/throw new Error\('Too many guest sessions/)
  })
})

describe('what /try says when the network is capped', () => {
  const gate = withoutComments(read('src/components/try/guest-gate.tsx'))
  const capScreen = gate.slice(
    gate.indexOf("refusal === 'network-cap'"),
    gate.indexOf("refusal === 'unknown'"),
  )

  /**
   * The words, without the markup around them. Scanning the JSX itself for a
   * digit finds `gap-4` and `size-8` in the Tailwind classes and fails on
   * every screen ever written, so the attributes come off first.
   */
  const capCopy = capScreen.replace(/\w+="[^"]*"/g, '').replace(/<[^>]*>/g, ' ')

  it('found the screen and the copy on it', () => {
    expect(capScreen.length).toBeGreaterThan(200)
    expect(capCopy).toMatch(/guest sessions/i)
  })

  /**
   * The policy-versus-configuration rule /faq is held to, applied here.
   * `GUEST_SESSIONS_PER_IP_PER_DAY` is a number someone tunes; a sentence
   * quoting it is wrong the moment they do, and nobody re-reads a screen they
   * only ever see when it is too late to check.
   */
  it('quotes no number, because the cap is configuration and not policy', () => {
    expect(capCopy).not.toMatch(/\d/)
    expect(capCopy).not.toMatch(/\bten\b/i)
  })

  it('says the limit belongs to the network rather than to the person reading it', () => {
    expect(capCopy).toMatch(/network/i)
  })

  it('says when it lifts, instead of offering a refresh that cannot work', () => {
    expect(capCopy).toMatch(/tomorrow/i)
    expect(capScreen).not.toMatch(/window\.location\.reload/)
  })

  /**
   * The account is the answer to this refusal: the cap counts guest sessions,
   * and an account is not one. It could not be offered while the free week
   * redirected every /auth screen to /try, because the link would have bounced
   * a refused visitor back to the page refusing them. Only sign-up closes for
   * the week now, so sign-in is offered in both states and sign-up in the one
   * where it opens.
   */
  it('offers sign-in whether or not the week is on', () => {
    expect(capScreen).toMatch(/href="\/auth\/sign-in"/)
  })

  it('offers sign-up only outside the week, and Explore inside it', () => {
    const week = capScreen.slice(capScreen.indexOf('freeWeek ? ('), capScreen.indexOf(') : ('))
    expect(week).not.toMatch(/\/auth\/sign-up/)
    expect(week).toMatch(/href="\/explore"/)
    expect(capScreen).toMatch(/\/auth\/sign-up/)
  })

  it('never sends a refused visitor to the page that refused them', () => {
    expect(capScreen).not.toMatch(/href="\/try/)
  })
})
