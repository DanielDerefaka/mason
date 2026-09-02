import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The auth hook's copy, read from disk.
 *
 * Every toast in that file is read at the worst moment, by somebody whose
 * sign-in has just failed, so the rules for public copy apply: no em dash,
 * and no sentence that pins a server fault on the reader. The sign-up catch
 * shipped telling every failure "if you already have an account with this
 * email, sign in instead", including a backend that was down, and the sign-in
 * toast said to check the Convex deployment status, which is not a thing a
 * visitor can do.
 */
const source = readFileSync(join(process.cwd(), 'src/hooks/use-auth.ts'), 'utf8')
const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the auth hook', () => {
  it('punctuates copy like a person: no em dash in any string', () => {
    const offenders = withoutComments.split('\n').filter((line) => /—|\s–\s/.test(line))
    expect(offenders).toEqual([])
  })

  it('tells a backend failure apart from a wrong password, in words a visitor can act on', () => {
    expect(source).toContain(
      'The server rejected the request rather than your details. Your password is probably fine, try again in a moment.',
    )
    expect(source).not.toContain('Check the Convex deployment status')
  })

  it('reports why a sign-up failed rather than blaming the email for everything', () => {
    expect(source).toMatch(/track\('signup_failed', \{ reason/)
    expect(source).toContain("'backend_down'")
    expect(source).toContain("'account_exists'")
  })

  it('identifies the person once a password sign-in or sign-up resolves', () => {
    expect(source.match(/identifyAfterSignIn\(convex\)/g)?.length).toBe(2)
  })
})
