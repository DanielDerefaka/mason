import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { TOOLS } from './shapes'
import { historyKeys } from './tip'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')
const canvas = read('src/components/canvas/index.tsx')

/** The canvas's own key table, `v: 'select'` and the rest. */
const bindings = (() => {
  const from = canvas.indexOf('const TOOLS: Record<string, Tool> = {')
  return canvas.slice(from, canvas.indexOf('}', from))
})()

/**
 * The tooltips say what the keyboard does, checked against the keyboard.
 *
 * The regression this exists for: the tools carried a native `title` that
 * repeated the label and named no key, so the hint's "press F" was the only
 * shortcut written anywhere on the canvas and the other eight were a guess.
 * Each key cap is read from the same table the toolbar renders, and that
 * table is held to the canvas's binding table here, so a rebinding on either
 * side fails before it lies in a tooltip.
 */
describe('toolbar shortcuts', () => {
  it('names, for every tool, the key the canvas binds to it', () => {
    for (const tool of TOOLS) {
      expect(tool.shortcut).toMatch(/^[A-Z]$/)
      expect(bindings).toContain(`${tool.shortcut.toLowerCase()}: '${tool.value}'`)
    }
  })

  it('shows every tool a tooltip rather than a browser title', () => {
    const shapes = read('src/components/canvas/toolbar/shapes/index.tsx')
    expect(shapes).toContain('<Tip key={value} label={label} shortcut={shortcut}>')
    expect(shapes).not.toContain('title=')
  })

  it('spells undo and redo the way the canvas binds them', () => {
    // Undo is mod+Z and redo the same chord with shift, whichever platform.
    expect(canvas).toContain("if (mod && event.key.toLowerCase() === 'z')")
    expect(canvas).toMatch(/if \(event\.shiftKey\) redo\(\)\s*else undo\(\)/)
    expect(historyKeys('⌘')).toEqual({ undo: '⌘Z', redo: '⇧⌘Z' })
    expect(historyKeys('Ctrl')).toEqual({ undo: 'Ctrl+Z', redo: 'Ctrl+Shift+Z' })

    const toolbar = read('src/components/canvas/toolbar/index.tsx')
    expect(toolbar).toContain('<Tip label="Undo" shortcut={keys.undo}>')
    expect(toolbar).toContain('<Tip label="Redo" shortcut={keys.redo}>')
  })

  it('promises the zoom buttons no key, since none is bound', () => {
    const zoom = read('src/components/canvas/toolbar/zoom/index.tsx')
    expect(zoom).not.toContain('shortcut=')
    expect(bindings).not.toMatch(/'zoom/)
  })

  it('shares one tooltip provider across the whole bar', () => {
    const toolbar = read('src/components/canvas/toolbar/index.tsx')
    expect(toolbar).toContain('<TooltipProvider delayDuration={300}>')
  })
})
