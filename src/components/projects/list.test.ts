import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

/**
 * The first thing a new account sees. It used to be a heading, a tab bar and
 * "No projects yet. Create one to get started.", with the only button that
 * makes something up in the navbar. Read from the source, because what is
 * under test is which query the count comes from and where the buttons go.
 */
describe('the dashboard first run says what Mason does and what there is to spend', () => {
  const list = read('src/components/projects/list.tsx')

  it('counts credits from the query the navbar badge reads', () => {
    expect(list).toContain('useQuery(api.credits.getBalance)')
    expect(read('src/components/navbar/index.tsx')).toContain('useQuery(api.credits.getBalance)')
  })

  it('carries the copy, and offers both ways to start', () => {
    expect(list).toContain('Your projects')
    expect(list).toContain('Pick up where you left off.')
    expect(list).toContain('Nothing here yet. Start a sketch and Mason builds the screen beside it.')
    expect(list).toContain('one credit is one generation')
    expect(list).toContain('New project')
    expect(list).toMatch(/<Link href="\/try">Open the canvas<\/Link>/)
  })

  it('waits for the balance rather than printing a placeholder in a sentence', () => {
    expect(list).toMatch(/credits == null\s*\?\s*''/)
  })

  it('is behind a session, so it says Mason and not the public name', () => {
    expect(list).not.toContain('SketchMason')
  })
})
