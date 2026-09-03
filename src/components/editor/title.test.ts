import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { designTitle } from './title'

/**
 * What shipped broken: the tab said "Editor" for every design, so five tabs
 * of the same product were five tabs called Editor.
 */
describe('designTitle', () => {
  it('names the tab after the design, and the product after that', () => {
    expect(designTitle({ headline: 'Pricing that makes sense' })).toBe(
      'Pricing that makes sense | Mason',
    )
  })

  it('falls back to the name on the canvas, then the instruction', () => {
    expect(designTitle({ label: 'Landing v2' })).toBe('Landing v2 | Mason')
    expect(designTitle({ instruction: 'a pricing page' })).toBe('a pricing page | Mason')
    expect(designTitle({ headline: '  ', label: null, instruction: undefined })).toBe(
      'Design | Mason',
    )
  })

  it('keeps it to one short line', () => {
    const long = 'A'.repeat(80)
    const title = designTitle({ headline: `${long}\n\nmore` })
    expect(title.length).toBeLessThan(70)
    expect(title.endsWith('… | Mason')).toBe(true)
  })

  // In a session the product is Mason; SketchMason is the name on the door.
  it('never says SketchMason', () => {
    expect(designTitle({ headline: 'x' })).not.toContain('SketchMason')
  })
})

describe('the editor tab', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/components/editor/index.tsx'), 'utf8')

  it('is named by the design it holds', () => {
    expect(source).toContain('document.title = designTitle(')
  })
})
