import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Which routes may spend one of a network's guest sessions.
 *
 * The regression this exists for: /try/editor and /try/preview both mounted
 * the gate in its minting form. Both read a project out of their own URL, so
 * they are useful only to the browser that already holds that session — and a
 * browser without a session owns no project either. Opening a preview link on
 * a second screen therefore signed a stranger in as a brand-new guest, spent
 * one of `GUEST_SESSIONS_PER_IP_PER_DAY` doing it, and rendered an empty page;
 * on a network already at the cap it showed the refusal screen instead, to
 * somebody whose only crime was looking at their own work on another monitor.
 *
 * Read from the source rather than rendered, because what is under test is a
 * call that must not happen.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const GATE = 'src/components/try/guest-gate.tsx'
const HOOK = 'src/components/try/use-guest-session.ts'

/**
 * Every file under src/app/try that mounts the gate, found rather than listed.
 * A new route added under /try has to decide which kind it is, and this is
 * what makes forgetting visible.
 */
const gateMounts = (() => {
  const root = join(process.cwd(), 'src/app/try')
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry)
      return statSync(path).isDirectory() ? walk(path) : [path]
    })
  return walk(root)
    .filter((path) => readFileSync(path, 'utf8').includes('<TryGuestGate'))
    .map((path) => [path.slice(path.indexOf('src/')), path] as const)
})()

describe('the routes that only display something', () => {
  it('found the /try routes that mount the gate', () => {
    expect(gateMounts.length).toBeGreaterThan(0)
  })

  it.each(gateMounts)('%s uses a session rather than creating one', (_label, path) => {
    expect(readFileSync(path, 'utf8')).toContain('<TryGuestGate admit={false}>')
  })

  /**
   * The other half, and the half that must not be broken while fixing this
   * one: /try itself is where a visitor starts, so it is the one place a
   * session is meant to be minted. The shell mounts the gate outside src/app,
   * which is why it is named here rather than swept up above.
   */
  it('leaves the canvas itself minting, or nobody can start at all', () => {
    const shell = read('src/components/try/shell.tsx')
    expect(shell).toContain('<TryGuestGate>')
    expect(shell).not.toContain('admit={false}')
  })
})

describe('the hook', () => {
  const hook = read(HOOK)

  it('refuses to admit before anything else in the effect', () => {
    expect(hook).toContain('if (!admit || isLoading || isAuthenticated || attempted.current) return')
  })

  it('defaults to minting, so the canvas keeps working by saying nothing', () => {
    expect(hook).toContain('admit = true')
  })

  it('reports a settled signed-out visitor separately from any refusal', () => {
    expect(hook).toContain('const sessionless = !admit && !isLoading && !isAuthenticated')
  })
})

describe('what a second screen is told', () => {
  const gate = read(GATE)
  const screen = gate.slice(gate.indexOf('if (sessionless)'), gate.indexOf('The cap is a rule'))
  const copy = screen.replace(/\w+="[^"]*"/g, '').replace(/<[^>]*>/g, ' ')

  it('says where the work actually is', () => {
    expect(copy).toMatch(/browser/i)
  })

  it('offers the canvas, not an account', () => {
    expect(screen).toContain('href="/try"')
    expect(screen).not.toMatch(/\/auth/)
  })

  /**
   * It is not an error, and must not read as one. The screen this replaced
   * was an empty editor; the screen beside it is a refusal. This is neither —
   * nothing failed, and telling someone something went wrong when nothing did
   * sends them to reload a page that will say the same thing again.
   */
  it('does not call it a failure', () => {
    expect(copy).not.toMatch(/error|wrong|failed|try again|busy/i)
  })
})
