import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ExploreNotice } from './explore-notice'
import { GuestProvider } from './guest-context'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const render = (isGuest: boolean) =>
  renderToStaticMarkup(
    createElement(GuestProvider, { isGuest, children: createElement(ExploreNotice) }),
  )

describe('the notice before the first Generate', () => {
  /**
   * The regression this exists for: every finished guest design went to
   * Explore, and the only place that said so was a toast after the fact.
   */
  it('tells a guest what happens to a finished design, and that it can be undone', () => {
    expect(render(true)).toContain(
      'Finished designs appear on Explore. You can hide yours afterwards.',
    )
  })

  /** The shell publishes nothing for an account, so the sentence would be untrue. */
  it('says nothing to an account, on /try or the dashboard', () => {
    expect(render(false)).toBe('')
  })

  it('agrees with the shell about who is published without asking', () => {
    const shell = read('src/components/try/shell.tsx')
    const effect = shell.slice(shell.indexOf('if (!me?.isGuest)'), shell.indexOf('const saved ='))
    expect(effect).toContain('setToPublish([])')
  })
})

/**
 * The switch used to exist only on /try or for a guest, on the reasoning that
 * only /try designs are published. `explore.publish` never asked where the
 * caller was, only that they own the project, so an account was allowed to
 * publish from its dashboard and had no switch to do it with.
 */
describe('the switch', () => {
  it('appears on every finished design, not only on /try', () => {
    const source = read('src/components/try/explore-switch.tsx')
    expect(source).toContain('if (!ready) return null')
    expect(source).not.toMatch(/startsWith\('\/try'\)|isGuest|usePathname/)
  })

  it('may, because the mutation asks only who owns the project', () => {
    const explore = read('convex/explore.ts')
    const publish = explore.slice(
      explore.indexOf('export const publish'),
      explore.indexOf('export const setVisible'),
    )
    expect(publish).toContain('requireUser(ctx)')
    expect(publish).toContain('project.userId !== userId')
    expect(publish).not.toMatch(/isGuest|isAnonymous|guest/i)
  })
})
