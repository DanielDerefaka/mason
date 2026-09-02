import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * What shipped broken: Phone and Tablet narrowed a `<div>`.
 *
 * A narrow div is not a narrow screen. `@media (max-width: 768px)` and every
 * `vw` unit resolve against the window and nothing else, so none of the
 * responsive CSS the model wrote ever ran in the one view that exists to show
 * it. A visitor pressed the phone icon, saw a desktop layout crushed into
 * 390px, and read a warning underneath blaming the design for not fitting.
 *
 * Read off the source rather than rendered, because what is being protected is
 * the mechanism: the design has to be inside something with a viewport of its
 * own. A render test would pass just as happily against the div.
 */
const source = readFileSync(resolve(process.cwd(), 'src/components/editor/preview.tsx'), 'utf8')

describe('the device preview', () => {
  it('gives the design a viewport of its own', () => {
    expect(source).toContain('<iframe')
    expect(source).toContain('srcDoc=')
  })

  // The div is the bug. Nothing in this file may paint the design into this
  // document again, whatever it is narrowed to.
  it('never renders the design into this page', () => {
    expect(source).not.toContain('dangerouslySetInnerHTML')
  })

  /**
   * The same document the export writes. Two builders of one design disagree
   * eventually, and the disagreement is a visitor who previews a page, downloads
   * it and finds it renders differently.
   */
  it('builds the document the way the export does', () => {
    expect(source).toContain('buildDesignHtml')
  })

  /**
   * `srcdoc` inherits this origin, which is what leaves `contentDocument`
   * readable, which is how the frame's height and the design's fit are known.
   * A `sandbox` without `allow-same-origin` would take all three away silently.
   */
  it('keeps the frame readable and still refuses script', () => {
    const sandbox = source.match(/sandbox="([^"]+)"/)?.[1] ?? ''
    expect(sandbox).toContain('allow-same-origin')
    expect(sandbox).not.toContain('allow-scripts')
  })

  it('still offers the three widths', () => {
    for (const width of ['full', 'tablet', 'phone']) expect(source).toContain(`'${width}'`)
    expect(source).toContain('834')
    expect(source).toContain('390')
  })

  // The old wording told a visitor the design was wrong. With a real viewport
  // behind it, an overflow is a fact about the design, and the sentence says
  // what the visitor can do rather than what the design failed to be.
  it('does not blame the design for the preview', () => {
    expect(source).not.toContain('This design is wider than')
  })
})
