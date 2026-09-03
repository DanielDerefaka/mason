import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The hooks need a store, a browser and a model to run, so these read the
 * source. Each pins one thing the live audit of /try found broken.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('generating a design', () => {
  const source = read('src/hooks/use-frame.ts')

  /**
   * The regression this exists for: the panel was added only once the
   * response arrived, and the route holds its headers until the model's
   * first word. For most of a minute after the click the canvas showed
   * nothing had happened, and the banner had already said the turn was spent.
   */
  it('places the panel before the request goes out, so the wait is visible', () => {
    expect(source.indexOf('addGeneratedUI(')).toBeGreaterThan(-1)
    expect(source.indexOf('addGeneratedUI(')).toBeLessThan(
      source.indexOf("generateFetch('/api/generate'"),
    )
  })

  /**
   * The regression this exists for: the design lands a gutter to the right
   * of the frame, which at a zoom chosen for drawing is off the screen, and
   * the audit watched a page arrive with nothing on screen to show it had.
   */
  it('brings the sketch and the design into one view', () => {
    expect(source).toMatch(/focusOnRect\(\{/)
    expect(source).toMatch(/width: frame\.width \* 2 \+ GUTTER/)
  })

  /**
   * The regression this exists for: Generate on a second frame while the
   * first was running returned in silence, which reads as a click that did
   * not register.
   */
  it('refuses a second Generate out loud', () => {
    expect(source).toMatch(/toast\.info\('One design at a time'/)
    expect(source).not.toMatch(/if \(generatingFrameId\) return\n/)
  })

  /**
   * The regression this exists for: on a dropped stream the catch wrote the
   * panel's html to '' and streaming to false, which left it reading
   * "Waiting for the first chunk…" for good with the page that had arrived
   * thrown away. What arrived now stays, with Continue on offer; nothing
   * usable removes the panel instead.
   */
  it('keeps what arrived when the stream drops, and offers Continue', () => {
    expect(source).toMatch(/if \(placed && !isUnusable\(kept\)\)/)
    expect(source).toMatch(/onClick: \(\) => void continueDesign\(id, kept\)/)
    expect(source).toMatch(/if \(placed\) dispatch\(discardGeneratedUI\(id\)\)/)
    expect(source).not.toMatch(/html: '', streaming: false/)
  })

  /**
   * And the panel is discarded rather than removed. `removeShape` commits a
   * history entry, so a generation that produced nothing left two of them and
   * the first Cmd+Z after a failure restored the empty placeholder.
   */
  it('takes a refused panel back off without spending an undo', () => {
    expect(source).not.toMatch(/removeShape/)
  })

  it('promises no refund it cannot see', () => {
    // The browser cannot tell its own connection dropping from the model's,
    // and the route treats the two differently.
    expect(source).not.toMatch(/credit has been returned/)
  })

  /**
   * The regression this exists for: a 402 opened the out-of-credits sheet
   * and put a toast reading "You are out of credits" on top of it.
   */
  it('shows no toast over the out-of-credits sheet', () => {
    expect(source).toMatch(/if \(refused\.sheetOpened\) return/)
  })

  it('counts a 429 down rather than quoting a number that is stale at once', () => {
    expect(source).toMatch(/toastRetryCountdown\(message, refused\.retryAfter\)/)
    // The countdown itself moved beside the refusal it reads, because the
    // editor asks the same routes and is told to wait by the same limiter.
    expect(read('src/lib/try/generate-fetch.ts')).toMatch(/toast\.dismiss\(id\)/)
  })
})

describe('continuing a design', () => {
  const source = read('src/hooks/use-continue-design.ts')

  /**
   * The regression this exists for: the toast that offered Continue was
   * dismissed by the click, and a failed continuation put the old markup
   * back with a bare error. The page was cut, the offer was gone, and the
   * only way to finish was to pay for a whole new one.
   */
  it('keeps the continuation as far as it got and offers to try again', () => {
    expect(source).toMatch(/const kept = existing \+ stripTruncationMarker\(tail\)/)
    expect(source).toMatch(/label: 'Try again'/)
  })

  it('opens the sheet on a 402 like a first generation does', () => {
    expect(source).toMatch(/noteGenerateRefusal\(response\)/)
  })
})
