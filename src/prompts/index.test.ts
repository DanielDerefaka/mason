import { describe, expect, it } from 'vitest'
import { prompts } from '@/prompts'
import { describeStyleGuide } from '@/lib/style-guide-brief'

/**
 * The design prompt, pinned.
 *
 * Nothing read `src/prompts/index.ts` before this file, and it showed. The
 * Craft section dictated a spacing scale, a body size, an icon size, a card
 * anatomy and a mandatory footer, so two different sketches came back with
 * one rhythm; the Output section forbade class names "of any kind" while the
 * stylesheet section required them for hover and the breakpoints, and the
 * three follow-up prompts each restated the absolute half, so a revision
 * stripped the states the first pass had written; and with no guide and no
 * references the entire aesthetic direction was "a restrained, confident
 * palette and a common sans-serif", which is a description of the median
 * page. These tests hold the text to what replaced that. They read the prompt
 * as prose, whitespace folded, because the file is hard-wrapped and a rewrap
 * is not a change of meaning.
 */
const flat = (text: string) => text.replace(/\s+/g, ' ')

const system = prompts.generatedUi.system

/** The body of one `## Heading`, up to the next one. */
const section = (heading: string) => {
  const start = system.indexOf(`\n## ${heading}\n`)
  expect(start, `no "## ${heading}" section`).toBeGreaterThan(-1)
  const rest = system.slice(start + 1)
  const next = rest.indexOf('\n## ', 1)
  return next === -1 ? rest : rest.slice(0, next)
}

describe('the design prompt', () => {
  it('imports as plain TypeScript, with every backtick inside it escaped', () => {
    // A template literal with a stray backtick would fail to parse at all, so
    // reaching this line is the assertion.
    expect(typeof system).toBe('string')
    expect(system.length).toBeGreaterThan(1000)
  })

  it('reads the sketch as a plan and never falls back to the median page', () => {
    const opening = flat(system.slice(0, system.indexOf('\n## Reference images')))
    expect(opening).toContain('a plan, not a picture')
    expect(opening).toContain('tool colours')
    expect(opening).toContain('Columns come from x-positions')
    expect(opening).toContain('Labels are content')
    expect(opening).toContain('Empty space in the sketch is empty space in the design')
    expect(opening).toContain('Never fall back to "a modern SaaS landing page"')
    // The template reading it replaced: a wide box "is" a header, a row of
    // boxes "is" a card grid.
    expect(opening).not.toContain('a row of equal boxes is a card grid')
  })

  it('does not gate every composition move on a reference', () => {
    const composition = flat(section('Composition'))
    expect(composition).not.toContain('Use them when the reference does')
    expect(composition).toContain('Do not bolt them onto a plainly functional page')
    expect(composition).toContain('do not use all of them at once')
    // The moves themselves stay.
    expect(composition).toContain('One screen, one idea')
    expect(composition).toContain('Metadata at the corners')
  })

  describe('Craft', () => {
    const craft = flat(section('Craft'))

    it('asks for a direction first', () => {
      expect(craft).toContain("decide the design's direction in one sentence")
      expect(craft).toContain('A page that could belong to any product has not been designed')
    })

    it('carries no preset spacing scale, body size or icon size', () => {
      // The regression this exists for: "4/8/12/16/24/32/48px", "14–16px" and
      // "16–20px" were the rhythm every generated page shared.
      expect(craft).not.toContain('4/8/12/16/24/32/48')
      expect(craft).not.toMatch(/14[–-]16px/)
      expect(craft).not.toMatch(/16[–-]20px/)
      expect(craft).not.toMatch(/\d+px/)
      expect(craft).toContain('not from a preset list')
    })

    it('names the defaults to leave out', () => {
      expect(craft).toContain('### Not this')
      expect(craft).toContain('Trusted by')
      expect(craft).toContain('a footer with four link columns')
    })

    it('closes with a footer only when the sketch does', () => {
      // The regression this exists for: "A page ends with a footer. Whatever
      // the sketch shows, close the design with one" put a footer under a
      // component, a section and a screen state alike.
      expect(craft).toContain('If the sketch ends with a footer')
      expect(craft).not.toContain('Whatever the sketch shows, close the design with one')
      expect(craft).toContain('end where it ends')
    })

    it('ends on the footer paragraph rather than a stray bullet', () => {
      // The legibility rule used to dangle as a bullet after the footer
      // paragraph; it lives in the colour bullet now.
      expect(flat(system).endsWith('do not append sections it does not contain.')).toBe(true)
      expect(craft).toContain('so it stays legible')
    })
  })

  it('reconciles inline styles with the classes the stylesheet needs', () => {
    // The regression this exists for: "Do not use class names or utility
    // classes of any kind" sat two sections below "Give the elements that
    // change a class and write real media queries".
    const output = flat(section('Output'))
    expect(output).not.toContain('of any kind')
    expect(output).toContain('Style static properties with inline `style` attributes')
    expect(output).toContain('class names for exactly two things')
    expect(output).toContain('no class that only carries a static style')
    expect(output).toContain('var(--font-family)')
    expect(output).toContain('write the font family literally')
  })

  it('closes revise, node and mobile with one shared sentence that keeps the stylesheet', () => {
    // The regression this exists for: each of the three ended "no class
    // names, no script", so a revision was told to strip the hover states and
    // media queries of the design it was handed, and a revision replaces the
    // design outright.
    const trailing = (text: string) => flat(text.trim().split(/\n\s*\n/).at(-1) ?? '')
    const revise = trailing(prompts.revise.system)
    const node = trailing(prompts.node.system)
    const mobile = trailing(prompts.mobile.system)

    expect(node).toBe(revise)
    expect(mobile).toBe(revise)
    expect(revise).toContain('Keep the stylesheet')
    expect(revise).toContain('class names only for states and breakpoints')
    for (const text of [prompts.revise.system, prompts.node.system, prompts.mobile.system]) {
      expect(flat(text)).not.toContain('no class names')
    }
  })
})

describe('the no-guide fallback', () => {
  it('decides a direction instead of asking for a common sans-serif', () => {
    const alone = describeStyleGuide(null, 0)
    expect(alone).not.toContain('common sans-serif')
    expect(alone).not.toContain('restrained')
    expect(alone).toContain('not Inter')
    expect(alone).toContain('one accent')
    expect(alone).toContain('the CSS variables are unset')
  })

  it('defers to the references when there are any', () => {
    const withReferences = describeStyleGuide(null, 2)
    expect(withReferences).toContain('reference images')
    expect(withReferences).toContain('the brief below')
    expect(withReferences).not.toContain('not Inter')
  })
})
