import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { GUEST_PROJECT_LIMIT, PROJECT_CAP_REFUSAL, inWords } from '@/lib/try/project-cap'

/**
 * /try can hold more than one sketch, and the two ways that goes wrong are
 * both invisible until a visitor has already lost something. Enforced from
 * the source, because neither has a seam a unit test can reach: one lives in
 * a React ref, the other behind Convex auth.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('switching sketches cannot overwrite the one being left', () => {
  const source = read('src/hooks/use-autosave.ts')

  /**
   * The regression this exists for: hydration was guarded by a bare boolean,
   * which was correct only while /try had one project it never left. With a
   * switcher, opening a second sketch found the flag already true, declined
   * to load it, and the next autosave wrote the *first* canvas into the
   * second project's row — the sketch you switched to, gone, silently.
   */
  it('remembers which project the canvas holds, not merely that it holds one', () => {
    expect(source).toMatch(/hydratedFor/)
    expect(source).not.toMatch(/hydratedRef/)
  })

  it('refuses to save until the canvas holds the project it would save into', () => {
    expect(source).toMatch(/hydratedFor\.current !== projectId/)
  })

  it('hydrates only from the project the URL is actually asking for', () => {
    // `project` is a live query and lags a switch by a tick; loading the
    // stale answer under the new id is the same overwrite by another route.
    expect(source).toMatch(/project\._id !== projectId/)
  })

  it('re-runs when the project changes, or the guard would never be re-read', () => {
    expect(source).toMatch(/\[project, projectId, dispatch\]/)
  })
})

describe('a guest cannot make sketches without end', () => {
  const source = read('convex/project.ts')

  /**
   * `createProject` is reachable by anyone who can open a guest session, and
   * /try now offers a button for it. Unbounded, that is an unauthenticated
   * row-insert loop against the projects table.
   */
  it('bounds what one anonymous session may hold', () => {
    expect(source).toMatch(/GUEST_PROJECT_LIMIT/)
    expect(source).toMatch(/isAnonymous/)
  })

  it('counts live rows rather than the numbering counter', () => {
    // The counter never decreases, so capping on it would refuse a guest who
    // had tidied up — and the bound that matters is rows held at once.
    expect(source).toMatch(/archivedAt/)
    expect(source).toMatch(/>= GUEST_PROJECT_LIMIT/)
  })

  /**
   * It used to throw the sentence. Convex masks anything that is not a
   * `ConvexError` as "[Request ID: …] Server Error", so at the cap a guest saw
   * a fault and a "Try again" that could not work. The mutation throws the
   * code and the wording lives in `project-cap.ts`, beside the number it
   * quotes.
   */
  it('throws a code rather than a sentence, which Convex would mask', () => {
    expect(source).toMatch(/throw new ConvexError\(GUEST_PROJECT_CAP\)/)
    expect(source).not.toMatch(/Keep your work with an account/)
  })

  it('says the number the cap actually is, from the constant that enforces it', () => {
    expect(PROJECT_CAP_REFUSAL.title).toContain(inWords(GUEST_PROJECT_LIMIT))
    expect(PROJECT_CAP_REFUSAL.description.toLowerCase()).toContain('account')
  })
})

describe('a new sketch is not a new allowance', () => {
  /**
   * The whole point of the answer given here: more projects, same one free
   * generation a day. The allowance is keyed to the guest and the day, so
   * nothing in the pool may key on a project.
   */
  it('keys the free generation to the guest and the day, never the project', () => {
    const pool = read('convex/lib/pool.ts')
    expect(pool).toMatch(/lastPoolDay !== dayKey\(now\)/)
    expect(pool).not.toMatch(/projectId/)
  })
})
