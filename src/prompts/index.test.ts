import { describe, expect, it } from 'vitest'
import { prompts } from '@/prompts'
import { DISPLAY_MIN, MOTION, SECTION_PADDING, designSystemRules } from '@/lib/design-system'
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

  describe('The system', () => {
    it('is generated from the values the audit measures, not transcribed beside them', () => {
      // The whole point of `design-system.ts` is that one file feeds both the
      // prompt and `auditDesign`. Pasting the numbers into the prompt would
      // work on the day it was done and rot silently on the next change, and
      // the first symptom would be an audit that reports findings against a
      // rule the model was never told.
      expect(system).toContain(designSystemRules())
    })

    it('comes before Craft, which points back at it', () => {
      // Craft says "the scale above" and "the ramp above". If the system moved
      // below it those two bullets would refer to nothing.
      expect(system.indexOf('\n## The system\n')).toBeGreaterThan(-1)
      expect(system.indexOf('\n## The system\n')).toBeLessThan(system.indexOf('\n## Craft\n'))
    })

    it('carries the numbers rather than the adjectives they replaced', () => {
      const rules = flat(section('The system'))
      expect(rules).toContain(`at least ${DISPLAY_MIN}px at 1440px`)
      expect(rules).toContain('below 1** above 64px')
      expect(rules).toContain(`${SECTION_PADDING.desktop}px or more on desktop`)
      expect(rules).toContain(MOTION.easings.out)
      expect(rules).toContain('2 on mobile')
    })
  })

  it('does not contradict the system in the examples it shows', () => {
    // Every one of these was in the prompt when the system landed, and each
    // would have taught the model the thing the audit then flagged: a hero
    // capped at 64px, a 34px mobile headline, 48px section padding and a
    // one-column phone grid. A prompt that argues with itself teaches the
    // half that comes with a code sample.
    const responsive = section('Responsive')
    expect(responsive).not.toContain('clamp(32px,6vw,64px)')
    expect(responsive).toContain('clamp(48px,9vw,128px)')
    expect(responsive).not.toMatch(/font-size: 34px/)
    expect(responsive).not.toMatch(/padding: 48px/)
    expect(responsive).toMatch(/padding: 96px/)
    expect(responsive).not.toContain('grid-template-columns: 1fr;')
  })

  describe('Craft', () => {
    const craft = flat(section('Craft'))

    it('asks for a direction first', () => {
      expect(craft).toContain("decide the design's direction in one sentence")
      expect(craft).toContain('A page that could belong to any product has not been designed')
    })

    it('states no sizes of its own, and defers to the system for them', () => {
      // The regression this exists for: "4/8/12/16/24/32/48px", "14–16px" and
      // "16–20px" were the rhythm every generated page shared.
      expect(craft).not.toContain('4/8/12/16/24/32/48')
      expect(craft).not.toMatch(/14[–-]16px/)
      expect(craft).not.toMatch(/16[–-]20px/)
      expect(craft).not.toMatch(/\d+px/)
      // Craft used to answer this with "not from a preset list", which was the
      // right instinct against the wrong target: the fault in that scale was
      // that it stopped at 48px, not that it was written down. A scale that
      // cannot express a 272px section produces a stack whether it was preset
      // or improvised. So the values are preset now, in one place, and Craft's
      // job is which step to reach for rather than what the steps are.
      expect(craft).toContain('Spacing comes from the scale above')
      expect(craft).toContain('Which step is the design work')
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

describe('the design prompt, assembled for the request', () => {
  const { systemFor } = prompts.generatedUi
  const alone = systemFor({ referenceCount: 0 })

  /**
   * The regression this exists for: a guest on /try, who can supply no
   * references, got sixty lines on reading the reference before writing, an
   * imagery section that assumed one, and then a user turn saying there were
   * none. The prompt was one constant, so nothing could leave anything out.
   */
  it('leaves the reference sections out when no reference was supplied', () => {
    expect(alone).not.toContain('## Reference images')
    expect(alone).not.toContain('Read before you write')
    expect(alone).not.toContain('style references only')
    expect(alone).not.toContain('same job it has in the reference')
    expect(alone).toContain('There are no reference images')
  })

  it('keeps everything that is not about a reference', () => {
    for (const heading of [
      'Read the sketch',
      'Imagery',
      'Composition',
      'Build controls, do not draw them',
      'Output',
      'Responsive',
      'The system',
      'Craft',
    ]) {
      expect(alone, `no "## ${heading}" without references`).toContain(`\n## ${heading}\n`)
    }
    // The class contract the revisions depend on, the image path, the
    // defaults to leave out, and the closing footer paragraph.
    expect(flat(alone)).toContain('Use class names for exactly two things')
    expect(alone).toContain('/api/image/{width}/{height}/{keywords}')
    expect(alone).toContain('### Not this')
    expect(flat(alone).endsWith('do not append sections it does not contain.')).toBe(true)
    expect(alone).toContain(designSystemRules())
  })

  it('brings them back with a reference, and is then the whole prompt', () => {
    expect(systemFor({ referenceCount: 1 })).toBe(system)
    expect(systemFor({ referenceCount: 3 })).toContain('## Reference images')
    expect(systemFor({ referenceCount: 3 })).toContain('style references only')
  })

  it('never sizes the first screen to the viewport', () => {
    // The regression this exists for: "build the hero as `min-height: 100vh`"
    // sent a landscape frame back as a portrait page twice its height, with
    // the frame's own height in the manifest the whole time.
    expect(system).not.toContain('min-height: 100vh')
    expect(alone).not.toContain('min-height: 100vh')
    expect(flat(section('Composition'))).toContain('The first screen is the frame')
  })

  it('reads the frame as the page, the box as the room for its words, and a placeholder as an image', () => {
    const opening = flat(system.slice(0, system.indexOf('\n## Reference images')))
    expect(opening).toContain('The frame is the page')
    expect(opening).toContain('Do not add height the sketch does not have')
    expect(opening).toContain('the box wins')
    expect(opening).toContain('A light box marked "image"')
    // The live failure: "GET FREE" came back as "GET STARTED".
    expect(opening).toContain('a text element reading "GET FREE" is that button\'s wording, in that case')
  })

  it('states the responsive contract in concrete terms', () => {
    // The regression this exists for: the prompt asked for responsiveness in
    // general terms, and the phone preview's header never collapsed while
    // the call to action ran off the right edge.
    const responsive = flat(section('Responsive'))
    expect(responsive).toContain('### The contract')
    expect(responsive).toContain('Below 768px the header collapses')
    expect(responsive).toContain(
      'Nothing is `position:absolute` or `position:fixed` where it could cover flow content',
    )
    expect(responsive).toContain('Images and buttons stay inside the box they are in')
    expect(responsive).toContain('Text wraps.')
    expect(responsive).toContain('Nothing is wider than the viewport')
    expect(section('Responsive')).toContain('@media (max-width: 768px)')
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
