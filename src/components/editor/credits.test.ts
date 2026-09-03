import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('running out of credits in the editor', () => {
  const editor = read('src/components/editor/index.tsx')
  const credits = read('src/components/editor/credits.tsx')

  /**
   * What shipped broken: a 402 from Ask AI was a toast saying "Out of
   * credits" and nothing to do about it, in the one place a guest most wants
   * to keep going. The canvas opened a sheet with the two ways on; the editor
   * now opens the same sheet, through the same reading of the response.
   */
  it('reads a refusal the way the canvas does and opens the sheet', () => {
    expect(editor).toContain('noteGenerateRefusal(response)')
    // Read from the refusal rather than worked out again from the status and
    // this file's own idea of the workspace: two readings of one 402 is how
    // the toast gets back on top of the sheet.
    expect(editor).toContain('if (refusal.sheetOpened) return')
    expect(editor).toContain("{workspace === '/try' && <EditorCredits projectId={projectId} />}")
    expect(credits).toContain('OUT_OF_CREDITS_EVENT')
    expect(credits).toContain('<OutOfCreditsSheet')
    expect(credits).toContain('<KeyDialog')
  })

  /**
   * And a 429 here counts down, as it does on the canvas. The editor read the
   * refusal as a bare string before the two branches met, so a wait arrived
   * as "Too many requests" with nothing saying how long.
   */
  it('counts a rate limit down rather than stating it once', () => {
    expect(editor).toContain('toastRetryCountdown(title, refusal.retryAfter)')
  })
})

describe('the save status', () => {
  const editor = read('src/components/editor/index.tsx')

  it('offers a retry when a save failed, and flushes on the way out', () => {
    expect(editor).toContain('onClick={retry}')
    expect(editor).toContain('Could not save')
    expect(editor).toContain('onClick={() => flush()}')
  })
})

describe('the share dialog', () => {
  const share = read('src/components/editor/share.tsx')

  /**
   * What shipped broken: the dialog promised "anyone with this link can view
   * it" with no end on the promise, to the one kind of account whose work
   * has one. A guest's design is kept for fourteen days.
   */
  it('tells a guest how long the link lasts, and only a guest', () => {
    expect(share).toContain('fourteen days')
    expect(share).toContain('isGuest && token !== undefined')
    expect(share).not.toContain('14 days')
  })
})
