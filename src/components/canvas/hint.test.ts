import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { TOOLS } from './toolbar/shapes'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')
const canvas = read('src/components/canvas/index.tsx')

/** The hint alone, from its comment to the sidebar drawn after it. */
const block = canvas.slice(
  canvas.indexOf('{/* First-run hint'),
  canvas.indexOf('<InspirationSidebar'),
)

/** What a visitor reads: comments and tags gone, whitespace folded. */
const text = block
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\{' '\}/g, ' ')
  .replace(/<[^>]*>/g, '')
  .replace(/\s+/g, ' ')
  .trim()

/**
 * The first-run hint, pinned as the behaviour it is.
 *
 * The regression this exists for: it opened with "Press F for a frame". On a
 * first visit that is a shortcut to something not yet found, and the toolbar
 * the key stands in for was never named. Every claim below is checked against
 * the control it describes rather than against a copy of the sentence, so
 * renaming a tool or rebinding a key fails here before it lies on the canvas.
 */
describe('the first-run hint', () => {
  it('opens with the move, then the toolbar, then the keys', () => {
    expect(text).toContain('Draw a frame, then press Generate.')
    expect(text.indexOf('toolbar below')).toBeGreaterThan(-1)
    expect(text.indexOf('toolbar below')).toBeLessThan(text.indexOf('press F'))
  })

  it('names tools by the label the toolbar gives them', () => {
    const labels = TOOLS.map((tool) => tool.label)
    for (const name of ['Frame', 'Rectangle', 'Text']) {
      expect(labels).toContain(name)
      expect(text).toContain(name)
    }
  })

  it('names keys the canvas actually binds to those tools', () => {
    const from = canvas.indexOf('const TOOLS: Record<string, Tool> = {')
    const table = canvas.slice(from, canvas.indexOf('}', from))
    for (const binding of ["f: 'frame'", "r: 'rectangle'", "t: 'text'"]) {
      expect(table).toContain(binding)
    }
    expect(text).toContain('press F, R and T.')
  })

  it('calls the presets button what the header calls it, and puts it where it is', () => {
    expect(text).toContain('New frame above picks a device size for you.')
    expect(read('src/components/try/header.tsx')).toMatch(/\/>\s*New frame\s*</)
    expect(read('src/components/canvas/frame-presets/index.tsx')).toContain('>New frame<')
  })

  /**
   * It said "A labelled box is an instruction, an unlabelled one is a guess",
   * which names no tool and no gesture: nothing on the canvas is called a
   * label, and a first visitor had no way to find out that the Text tool is
   * how a box gets one. The sentence now says the thing to do.
   */
  it('says that text in a box is what tells Mason what the box is', () => {
    expect(text).toContain('Text inside a box says what it is')
  })

  /**
   * A photo placed on bare canvas used to be a picture with nothing to press:
   * the pills and the instruction bar belong to a frame, and no word said so.
   * The hint offers the paper route now, and every gesture it names is one
   * the canvas wires, ending in the frame it promises.
   */
  it('offers a photographed paper sketch a route it can actually take', () => {
    expect(text).toContain('Sketched on paper? Photograph it and drop or paste the photo here.')
    expect(text).toContain('It gets a frame of its own.')
    expect(canvas).toContain('onDrop={')
    expect(canvas).toContain("window.addEventListener('paste'")
    expect(canvas).toContain('dispatch(wrapImageInFrame(')
  })

  /**
   * It went at the first shape. A rectangle drawn to see what the tool did
   * took the instructions with it while the one step that leads anywhere, a
   * frame, was still undone.
   */
  it('stays until there is a frame, not until there is a shape', () => {
    expect(block).toContain('{!hasFrame && (')
    expect(block).not.toContain('shapes.length === 0')
    expect(canvas).toContain("const hasFrame = shapes.some((shape) => shape.kind === 'frame')")
  })

  /** The sentence is pinned beside its component; here, that the hint carries it. */
  it('says what happens to a finished design before it happens', () => {
    expect(block).toContain('<ExploreNotice />')
  })

  /**
   * `src/components/canvas` is outside metadata.test.ts's sweep, so the rule
   * it enforces, no em dash a visitor can read, is repeated for this block.
   */
  it('carries no em dash a visitor can read', () => {
    const copy = block.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    expect(copy).not.toMatch(/—|\s–\s/)
  })
})
