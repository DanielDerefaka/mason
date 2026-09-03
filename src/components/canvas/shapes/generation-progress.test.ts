import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { formatElapsed, generationStage } from './generation-progress'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('what the panel says while a design is on its way', () => {
  it('reads the sketch until the first markup, then writes the page', () => {
    expect(generationStage(undefined)).toBe('Reading your sketch')
    expect(generationStage('')).toBe('Reading your sketch')
    expect(generationStage('<style>')).toBe('Writing the page')
  })

  it('counts the wait like a clock', () => {
    expect(formatElapsed(0)).toBe('0s')
    expect(formatElapsed(12_400)).toBe('12s')
    expect(formatElapsed(72_000)).toBe('1m 12s')
    expect(formatElapsed(-5)).toBe('0s')
  })
})

/**
 * The regression this exists for: the panel showed "Waiting for the first
 * chunk…" for the whole eighty seconds a page takes, and a spinner reading
 * "Designing…" with no clock. Nothing on the canvas moved, so the audit's
 * own note was that it looked hung. The stage and the elapsed time are now
 * rendered from the helper above, and the old line is gone.
 */
describe('the design panel shows its progress', () => {
  const source = read('src/components/canvas/shapes/generated-ui.tsx')

  it('renders the stage and the clock, not a fixed line', () => {
    expect(source).toMatch(/generationStage\(shape\.html\)/)
    expect(source).toMatch(/formatElapsed\(elapsed\)/)
    expect(source).not.toMatch(/Waiting for the first chunk/)
    expect(source).not.toMatch(/Designing…/)
  })

  it('starts the clock when streaming starts, so a Continue restarts it', () => {
    expect(source).toMatch(/\[shape\.streaming\]\)/)
  })
})
