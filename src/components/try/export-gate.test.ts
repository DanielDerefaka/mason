import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * What a guest may take away, and what it costs them.
 *
 * Both rules are one-line mistakes to undo and neither shows up in a type
 * error, so they are pinned from the source. The behaviour they protect is
 * the promise /try is sold on: nothing here needs an account.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('a download costs an email, never an account', () => {
  const gate = read('src/components/try/guest-gate.tsx')

  /**
   * The regression this exists for: the email gate was mounted only while
   * `FREE_WEEK` was on, and the account dialog every other day — so with the
   * flag off (its normal state) pressing Export on a canvas that needs no
   * account raised "Exporting needs an account. Make one and this canvas
   * comes with you."
   */
  it('mounts the email gate unconditionally', () => {
    expect(gate).toMatch(/<EmailGateDialog/)
    expect(gate).not.toMatch(/KeepYourWorkDialog/)
  })

  /**
   * The gate reads the flag now, for the exits around it: the cap screen, the
   * out-of-credits sheet and "Keep this canvas" say "accounts open soon"
   * during the week and offer one outside it. What a download costs is not
   * one of those. It is an address, in both states, and the two places that
   * could reintroduce the old bug are the toll itself and the dialog's mount.
   */
  it('does not let the free-week flag decide what a download costs', () => {
    const toll = gate.slice(gate.indexOf('const requireExport'), gate.indexOf('const settle'))
    expect(toll).not.toMatch(/freeWeek/)
    const mount = gate.slice(gate.indexOf('<EmailGateDialog'))
    expect(mount.slice(0, mount.indexOf('/>'))).not.toMatch(/freeWeek/)
  })

  it('asks once — a guest who has given an address is never stopped again', () => {
    expect(gate).toMatch(/if \(emailGivenRef\.current\) return Promise\.resolve\(true\)/)
  })

  it('leaves nothing behind that would offer an account', () => {
    expect(existsSync(join(process.cwd(), 'src/components/try/keep-your-work-dialog.tsx'))).toBe(
      false,
    )
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : [path]
      })
    const offenders = walk(join(process.cwd(), 'src'))
      // The tests naming the thing they forbid are not the thing itself.
      .filter((path) => !path.includes('.test.'))
      .filter((path) => /keep-your-work/.test(readFileSync(path, 'utf8')))
    expect(offenders).toEqual([])
  })
})

describe('the generated codebase is not part of the trial', () => {
  /**
   * A guest takes the design and the brief; the Next.js project is what an
   * account is for. Hidden rather than shown-and-refused — an offer withdrawn
   * at the click is worse than one never made.
   */
  it('hides the project export on the canvas for a guest', () => {
    const canvas = read('src/components/canvas/shapes/generated-ui.tsx')
    expect(canvas).toMatch(/const canExportProject = onExportProject && !isGuest/)
    expect(canvas).toMatch(/\{canExportProject && \(/)
  })

  it('hides it in the editor panel too, which is a separate route', () => {
    const panel = read('src/components/editor/properties.tsx')
    expect(panel).toMatch(/\{!isGuest && \(/)
    expect(panel).toMatch(/useGuest\(\)/)
  })

  it('still offers the design and the brief, which are what the email buys', () => {
    const canvas = read('src/components/canvas/shapes/generated-ui.tsx')
    expect(canvas).toMatch(/gated\(onExport\)/)
    expect(canvas).toMatch(/gated\(onExportPrompt\)/)
  })
})
