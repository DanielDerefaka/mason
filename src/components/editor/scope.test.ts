import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { DESIGN_SCOPE } from '@/lib/sanitise'

const DIR = 'src/components/editor'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

/** Source with its comments removed, so a comment cannot satisfy a guard. */
const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(\/\/|\{?\s*\/\*).*$/gm, '')

/**
 * The JSX of the element the design is painted into.
 *
 * Located by `ref={stage}` rather than by line number, because the guards
 * below are about that one element and nothing else on the artboard.
 */
const stageElement = () => {
  const source = withoutComments(read(`${DIR}/index.tsx`))
  const start = source.indexOf('ref={stage}')
  expect(start, 'the editor still paints into an element it calls `stage`').toBeGreaterThan(-1)
  const end = source.indexOf('/>', start)
  return source.slice(start, end)
}

describe('the design scope on the editing surface', () => {
  /**
   * What shipped broken: the class was added with `classList.add` in the paint
   * effect, which runs once. The same element's `className` carries a
   * `draggingNode &&` clause, so the first drag re-rendered it, React wrote the
   * attribute whole, and the class was gone for the rest of the session. Every
   * rule in the design's stylesheet is confined beneath it, so the hero stopped
   * being a grid and its image became a full-width block twice the height it
   * should be. It read as "I moved the image and cannot put it back", and no
   * amount of dragging could put it back, because dragging was never the cause.
   */
  it('is in the className React writes, not added imperatively', () => {
    expect(stageElement()).toContain('DESIGN_SCOPE')
  })

  it('is not added with classList anywhere in the editor', () => {
    for (const file of readdirSync(join(process.cwd(), DIR))) {
      if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue
      if (file.includes('.test.')) continue
      expect(
        withoutComments(read(`${DIR}/${file}`)),
        `${file} adds a class to a React-owned element imperatively`,
      ).not.toMatch(/classList\s*\.\s*add\s*\(\s*DESIGN_SCOPE/)
    }
  })

  /**
   * The reason the guard above matters rather than being a style preference.
   * A static className would survive an imperative addition, because React
   * only writes the attribute when the string changes.
   */
  it('sits on an element whose className changes as you drag', () => {
    expect(stageElement()).toMatch(/draggingNode\s*&&/)
  })

  it('is the class the design stylesheet is actually confined beneath', () => {
    expect(DESIGN_SCOPE).toBe('mason-design')
  })
})
