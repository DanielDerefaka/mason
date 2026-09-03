import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { isActionable, slugOf } from './ai'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const sections = [
  { id: '0', name: 'Header' },
  { id: '1', name: 'Hero: Design faster' },
  { id: '2', name: 'Call to action' },
]

/**
 * What shipped broken: Apply lit up for a bare "/". The token the picker was
 * reading counted as text, and so did the " the Hero " a choice leaves
 * behind, so a press on a section and a press on Apply sent the model a
 * sentence with no verb in it and spent a credit finding that out.
 */
describe('isActionable', () => {
  it('is false for nothing, a slash, or a half-typed token', () => {
    expect(isActionable('', sections)).toBe(false)
    expect(isActionable('/', sections)).toBe(false)
    expect(isActionable('/he', sections)).toBe(false)
    expect(isActionable('  /hero  ', sections)).toBe(false)
  })

  it('is false for an address with no instruction on it', () => {
    expect(isActionable(' the Hero ', sections)).toBe(false)
    expect(isActionable('the Call to action', sections)).toBe(false)
    expect(isActionable('the Hero: Design faster', sections)).toBe(false)
  })

  it('is true once something is asked', () => {
    expect(isActionable('Make the Hero bigger', sections)).toBe(true)
    expect(isActionable('Make it bigger', sections)).toBe(true)
    expect(isActionable('Tighten the spacing', sections)).toBe(true)
  })
})

describe('slugOf', () => {
  it('turns a name into one token', () => {
    expect(slugOf('Hero: Design faster')).toBe('hero-design-faster')
    expect(slugOf('Call to action')).toBe('call-to-action')
    expect(slugOf('Page')).toBe('page')
  })
})

describe('the Ask AI dock', () => {
  const panel = read('src/components/editor/ai.tsx')
  const editor = read('src/components/editor/index.tsx')

  it('enables Apply only for an instruction', () => {
    expect(panel).toContain('disabled={busy || !isActionable(instruction, sections)}')
  })

  /**
   * What shipped broken: Escape closed neither the "/" picker nor the panel.
   * The editor behind them took the key as "clear the selection" and the
   * dock stayed where it was.
   */
  it('closes the picker on Escape, then the panel', () => {
    expect(panel).toContain("if (event.key === 'Escape')")
    expect(panel).toContain('if (slash) setInstruction((current) => current.replace(SLASH, \'\'))')
    expect(panel).toContain('else onClose?.()')
    expect(editor).toContain('onClose={() => setAiOpen(false)}')
    expect(editor).toContain('if (aiOpen) setAiOpen(false)')
  })
})
