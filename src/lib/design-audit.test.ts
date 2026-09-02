import { describe, expect, it } from 'vitest'

import { AUDIT_RULES, auditDesign, declarationBlocks, hsl, pixels } from './design-audit'
import { DISPLAY_MIN, RADII, SECTION_PADDING, SPACE, TYPE_SCALE, designSystemRules } from './design-system'

/**
 * The audit's whole value is that its findings are real.
 *
 * A log line nobody trusts is a log line nobody reads, and one false positive a
 * week is enough to lose the other fourteen rules. So the first and largest
 * test here is a design that follows the system, which must produce **nothing**
 * — every check has to stand down on correct work before any of them is worth
 * having.
 */

/** A design built to the system, from the values the system publishes. */
const compliant = `<style>
  .cta { transition: background 0.25s cubic-bezier(0.25, 1, 0.5, 1); }
  .cta:hover { background: #0b5fd0; }
  @media (max-width: 640px) {
    .hero { font-size: 48px; }
    .band { padding-top: 96px; padding-bottom: 96px; }
  }
</style>
<div style="width:100%;box-sizing:border-box;background:#f3f3ec;font-family:'Fraunces', serif">
  <section class="band" style="padding-top:160px;padding-bottom:160px">
    <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-family:'Geist Mono', monospace">Chapter 01</p>
    <h1 class="hero" style="font-size:128px;line-height:0.88;letter-spacing:-0.024em">Ethereum with an edge</h1>
    <img src="/api/image/900/1200/architecture?i=1&amp;tone=light" alt="" width="900" height="1200" style="aspect-ratio:3/4;border-radius:4px">
    <button type="button" class="cta" style="border-radius:4px;background:#0b5fd0">Read the thesis</button>
  </section>
</div>`

describe('auditDesign', () => {
  it('finds nothing wrong with a design built to the system', () => {
    expect(auditDesign(compliant)).toEqual([])
  })

  it('has nothing to say about an empty design', () => {
    expect(auditDesign('')).toEqual([])
    expect(auditDesign(null)).toEqual([])
  })

  /** Every check must be reachable, or it is decoration. */
  it('reports only rules it declares', () => {
    const wrong = `<style>.c{transition:all .2s ease}</style>
      <div style="background:#ffffff;box-shadow:0 4px 12px rgba(0,0,0,.1);border-radius:16px;padding:80px 24px">
        <h1 style="font-size:56px;line-height:1.2;color:#6366f1">Build faster. Ship smarter. 🚀</h1>
        <div style="display:grid;grid-template-columns:repeat(3, 1fr)">
          <img src="/api/image/800/450/x?i=1" width="800" height="450" style="aspect-ratio:16/9">
          <img src="/api/image/800/450/y?i=2" width="800" height="450" style="aspect-ratio:16/9">
        </div>
        <div style="background:linear-gradient(90deg,#6366f1,#ec4899);height:200px"></div>
      </div>`
    const rules = auditDesign(wrong).map((finding) => finding.rule)
    expect(rules.length).toBeGreaterThan(8)
    for (const rule of rules) expect(AUDIT_RULES).toContain(rule)
  })
})

describe('each rule', () => {
  /** Runs the audit and says whether one rule fired, so a case reads as its rule. */
  const fires = (rule: string, html: string) => auditDesign(html).some((finding) => finding.rule === rule)

  it('catches a hero line under the display minimum', () => {
    expect(fires('timid-display', '<h1 style="font-size:56px">Hi</h1>')).toBe(true)
    expect(fires('timid-display', `<h1 style="font-size:${DISPLAY_MIN}px">Hi</h1>`)).toBe(false)
  })

  /**
   * `clamp` resolves to its cap, not its floor.
   *
   * The prompt asks for `clamp(32px, 6vw, 96px)` on headlines, so reading the
   * first argument would fail every correctly built fluid design — the loudest
   * possible false positive, on the rule most likely to be acted on.
   */
  it('reads a fluid headline at its desktop size', () => {
    expect(fires('timid-display', '<h1 style="font-size:clamp(32px, 6vw, 96px)">Hi</h1>')).toBe(false)
    expect(fires('timid-display', '<h1 style="font-size:clamp(24px, 3vw, 48px)">Hi</h1>')).toBe(true)
  })

  /**
   * The mobile rule is not the page's type scale.
   *
   * A design that correctly drops its 128px display line to 40px at 640px would
   * otherwise be reported as timid, which is exactly backwards.
   */
  it('ignores what happens inside a max-width query', () => {
    const responsive = `<style>@media (max-width: 640px){ .h{font-size:40px;line-height:1.2} }</style>
      <h1 class="h" style="font-size:96px;line-height:0.88;letter-spacing:-0.024em">Hi</h1>`
    expect(fires('timid-display', responsive)).toBe(false)
    expect(fires('loose-display', responsive)).toBe(false)
  })

  it('catches display type set at a body line-height', () => {
    expect(fires('loose-display', '<h1 style="font-size:96px;line-height:1.1">Hi</h1>')).toBe(true)
    expect(fires('loose-display', '<h1 style="font-size:96px;line-height:0.88">Hi</h1>')).toBe(false)
    expect(fires('loose-display', '<h1 style="font-size:96px">Hi</h1>')).toBe(true)
  })

  it('catches display type with no negative tracking', () => {
    expect(fires('untracked-display', '<h1 style="font-size:64px;line-height:.9">Hi</h1>')).toBe(true)
    expect(fires('untracked-display', '<h1 style="font-size:64px;line-height:.9;letter-spacing:-0.024em">Hi</h1>')).toBe(false)
  })

  /** Letter-spacing in px only compares to em when the font-size is beside it. */
  it('reads tracking in px against the size in the same block', () => {
    expect(fires('untracked-display', '<h1 style="font-size:100px;line-height:.9;letter-spacing:-2px">Hi</h1>')).toBe(false)
    expect(fires('no-micro-label', '<p style="font-size:12px;text-transform:uppercase;letter-spacing:1px">New</p>')).toBe(false)
    expect(fires('no-micro-label', '<p style="font-size:12px;text-transform:uppercase;letter-spacing:0.4px">New</p>')).toBe(true)
  })

  it('notices when the page has no spaced uppercase label at all', () => {
    expect(fires('no-micro-label', '<p style="font-size:12px">New</p>')).toBe(true)
  })

  it('notices a page set in one face', () => {
    expect(fires('one-family', '<p style="font-family:var(--font-family)">Hi</p>')).toBe(true)
    expect(fires('one-family', '<p style="font-family:Inter, sans-serif">Hi</p>')).toBe(true)
    expect(
      fires('one-family', '<p style="font-family:Fraunces, serif">A</p><p style="font-family:\'Geist Mono\', monospace">B</p>'),
    ).toBe(false)
  })

  /**
   * The band has to catch Tailwind's indigo-500 and violet-500 and leave a real
   * blue alone. Sharplink's #0e76ff is the control: a saturated blue at hue 213
   * that a wider band would wrongly condemn.
   */
  it('catches indigo and violet without catching blue', () => {
    expect(fires('slop-accent', '<div style="background:#6366f1"></div>')).toBe(true)
    expect(fires('slop-accent', '<div style="background:#8b5cf6"></div>')).toBe(true)
    expect(fires('slop-accent', '<div style="background:#0e76ff"></div>')).toBe(false)
    expect(fires('slop-accent', '<div style="background:#abff02"></div>')).toBe(false)
    // A desaturated navy is a ground, not an accent, whatever its hue.
    expect(fires('slop-accent', '<div style="background:#17233b"></div>')).toBe(false)
  })

  it('catches a pure white or pure black ground', () => {
    expect(fires('pure-ground', '<div style="background:#fff"></div>')).toBe(true)
    expect(fires('pure-ground', '<div style="background-color:white"></div>')).toBe(true)
    expect(fires('pure-ground', '<div style="background:#000000"></div>')).toBe(true)
    expect(fires('pure-ground', '<div style="background:#f3f3ec"></div>')).toBe(false)
    // Pure white as *ink* is right on a dark ground; only the ground is checked.
    expect(fires('pure-ground', '<p style="color:#ffffff">Hi</p>')).toBe(false)
  })

  it('allows a transparency ramp and refuses a two-hue gradient', () => {
    expect(fires('two-hue-gradient', '<div style="background:linear-gradient(#6366f1,#ec4899)"></div>')).toBe(true)
    expect(fires('two-hue-gradient', '<div style="background:linear-gradient(0deg,#000 55%,transparent 95%)"></div>')).toBe(false)
    // One hue at two lightnesses is a ramp, not a gradient between colours.
    expect(fires('two-hue-gradient', '<div style="background:linear-gradient(#0e76ff,#99c5ff)"></div>')).toBe(false)
  })

  it('catches a box-shadow', () => {
    expect(fires('box-shadow', '<div style="box-shadow:0 4px 12px rgba(0,0,0,.08)"></div>')).toBe(true)
    expect(fires('box-shadow', '<div style="box-shadow:none"></div>')).toBe(false)
  })

  it('catches the 16px radius and a single radius on everything', () => {
    expect(fires('radius', '<div style="border-radius:16px"></div>')).toBe(true)
    expect(fires('radius', '<div style="border-radius:12px"></div>')).toBe(true)
    for (const value of RADII.filter((step) => step > 0)) {
      expect(fires('radius', `<div style="border-radius:${value}px"></div>`)).toBe(false)
    }
  })

  it('catches three equal cards in a row', () => {
    expect(fires('three-equal-cards', '<div style="grid-template-columns:repeat(3, 1fr)"></div>')).toBe(true)
    expect(fires('three-equal-cards', '<div style="grid-template-columns:repeat(3,minmax(0,1fr))"></div>')).toBe(true)
    expect(fires('three-equal-cards', '<div style="grid-template-columns:1fr 1fr 1fr;"></div>')).toBe(true)
    expect(fires('three-equal-cards', '<div style="grid-template-columns:2fr 1fr 1fr"></div>')).toBe(false)
    // The reflowing grid the prompt asks for is not three equal cards.
    expect(fires('three-equal-cards', '<div style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))"></div>')).toBe(false)
  })

  it('catches a page whose deepest section is a Tailwind py-24', () => {
    expect(fires('thin-sections', '<section style="padding:96px 24px"></section>')).toBe(true)
    expect(fires('thin-sections', `<section style="padding:${SECTION_PADDING.desktop}px 24px"></section>`)).toBe(false)
    expect(fires('thin-sections', '<section style="padding-block:200px"></section>')).toBe(false)
  })

  it('catches the CSS keywords in motion', () => {
    expect(fires('lazy-motion', '<style>.a{transition:all .2s ease}</style>')).toBe(true)
    expect(fires('lazy-motion', '<style>.a{transition:background .3s ease-in-out}</style>')).toBe(true)
    expect(fires('lazy-motion', '<style>.a{transition:background .25s cubic-bezier(0.25, 1, 0.5, 1)}</style>')).toBe(false)
  })

  it('catches a page with no portrait imagery', () => {
    const landscape = '<img width="800" height="450"><img width="1200" height="675">'
    expect(fires('landscape-only', landscape)).toBe(true)
    expect(fires('landscape-only', '<img width="800" height="450"><img width="900" height="1200">')).toBe(false)
    // One image is not a pattern.
    expect(fires('landscape-only', '<img width="800" height="450">')).toBe(false)
  })

  it('catches an emoji standing in for an icon, and leaves an arrow alone', () => {
    expect(fires('emoji', '<p>🚀 Fast</p>')).toBe(true)
    expect(fires('emoji', '<a href="#">Read the thesis →</a>')).toBe(false)
    // Inside an attribute is not page content.
    expect(fires('emoji', '<img alt="rocket" src="/api/image/800/600/x?i=1">')).toBe(false)
  })
})

describe('reading CSS out of a fragment', () => {
  it('reads both quote styles of style attribute and every rule in the sheet', () => {
    const blocks = declarationBlocks(`<style>.a{color:red}.b{color:blue}</style><p style="margin:0"><i style='padding:4px'>`)
    expect(blocks).toContain('margin:0')
    expect(blocks).toContain('padding:4px')
    expect(blocks).toContain('color:red')
    expect(blocks).toContain('color:blue')
  })

  it('does not mistake a longhand for the shorthand it starts with', () => {
    expect(auditDesign('<section style="padding-top:200px"></section>').map((f) => f.rule)).not.toContain('thin-sections')
  })

  it('resolves lengths to desktop pixels', () => {
    expect(pixels('64px')).toBe(64)
    expect(pixels('4rem')).toBe(64)
    expect(pixels('5vw')).toBe(72)
    expect(pixels('clamp(32px, 6vw, 96px)')).toBeCloseTo(86.4, 5)
    expect(pixels('min(3.6vw, 96px)')).toBeCloseTo(51.84, 5)
    // A height this file cannot resolve is a refusal, not a guess.
    expect(pixels('50vh')).toBeNull()
    expect(pixels('auto')).toBeNull()
  })

  it('reads hue, saturation and lightness off a hex', () => {
    expect(hsl('#6366f1')?.h).toBeCloseTo(239, 0)
    expect(hsl('#0e76ff')?.h).toBeCloseTo(214, 0)
    expect(hsl('#fff')?.s).toBe(0)
    expect(hsl('rgb(0,0,0)')).toBeNull()
  })
})

/**
 * The prompt and the audit read one file, and this is what keeps them doing so.
 *
 * The failure this exists for is the quiet one: a prompt that asks for 160px
 * sections beside an audit that passes 96px. Both would be green, both would be
 * wrong, and the designs would keep coming out generic with nothing to say why.
 */
describe('the system the prompt states', () => {
  const rules = designSystemRules()

  it('states the numbers the audit measures', () => {
    expect(rules).toContain(`${SECTION_PADDING.desktop}px or more on desktop`)
    expect(rules).toContain(`at least ${DISPLAY_MIN}px`)
    expect(rules).toContain(RADII.join(', '))
    expect(rules).toContain(SPACE.desktop.join(', '))
  })

  it('carries every type role with its line-height and tracking', () => {
    for (const step of TYPE_SCALE) {
      expect(rules).toContain(`| ${step.role} | ${step.desktop} | ${step.mobile} | ${step.lineHeight} |`)
    }
  })

  /** The scale is only worth having if it is uneven; a flat ramp is the tell. */
  it('is dense where you read and dramatic where you look', () => {
    const ratio = (a: number, b: number) => a / b
    const display = ratio(TYPE_SCALE[0].desktop, TYPE_SCALE[1].desktop)
    const text = ratio(TYPE_SCALE[7].desktop, TYPE_SCALE[8].desktop)
    expect(display).toBeGreaterThan(1.3)
    expect(text).toBeLessThan(1.2)
  })
})
