import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { RESET_LAYER, designResetCss } from './design-reset'
import { buildDesignHtml } from './export'
import { DESIGN_SCOPE, sanitiseHtml, splitTop } from './sanitise'
import type { Shape } from '@/redux/slice/shapes'
import type { StyleGuide } from '@/types/style-guide'

/**
 * The HTML export's whole promise is that the file shows what the editor
 * showed. The editor renders a design inside this application's document,
 * under Tailwind's preflight; the file has to carry the part of that the
 * design was drawn against, or a person opens it and sees a page the editor
 * never displayed.
 */
const design = (html: string): Shape => ({
  id: 'd1',
  kind: 'generated-ui',
  x: 0,
  y: 0,
  width: 1280,
  height: 900,
  fill: 'transparent',
  label: 'Pricing page',
  html,
})

const guide = {
  theme: 'Quiet Industrial',
  description: 'Restrained, high contrast.',
  colorSections: [
    {
      title: 'Core',
      swatches: [
        { name: 'Background', token: '--background', color: '#0a0a0a' },
        { name: 'Primary', token: '--primary', color: '#4F46E5' },
      ],
    },
  ],
  typography: { fontFamily: 'Inter, sans-serif', styles: [] },
  typeScale: [],
  radii: [],
} as unknown as StyleGuide

const build = (html: string, styleGuide: StyleGuide | null = guide) =>
  buildDesignHtml(design(html), styleGuide, { origin: 'https://mason.example' })

const parse = (doc: string) => new DOMParser().parseFromString(doc, 'text/html')

const scope = `.${DESIGN_SCOPE}`

describe('buildDesignHtml', () => {
  const markup =
    '<style>.mason-design p { color: red }</style>' +
    '<section><h1 style="font-size: 48px">Plans</h1><p>Simple.</p><ul><li>One</li></ul><button>Join</button></section>'
  const doc = build(markup)

  it('is a document a browser can open', () => {
    const parsed = parse(doc)
    expect(doc.startsWith('<!doctype html>')).toBe(true)
    expect(parsed.documentElement.lang).toBe('en')
    expect(parsed.title).toBe('Pricing page')
    expect(parsed.querySelector(scope)).not.toBeNull()
  })

  it('leaves the design markup as the sanitiser wrote it', () => {
    expect(doc).toContain(sanitiseHtml(markup))
  })

  it('carries the reset the editor rendered under', () => {
    /**
     * The regression this exists for: the file shipped `* { box-sizing }`
     * and body basics and nothing else, so a paragraph regained its 1em
     * margins, a nav list its bullets and 40px indent, a button its grey
     * border and the system font, and a heading that only set its size came
     * back bold. None of that was on screen in the editor.
     */
    const style = parse(doc).querySelector('head style')?.textContent ?? ''
    expect(style).toContain(`@layer ${RESET_LAYER} {`)
    for (const rule of [
      `${scope} h1, ${scope} h2, ${scope} h3, ${scope} h4, ${scope} h5, ${scope} h6 { font-size: inherit; font-weight: inherit; }`,
      `${scope} ol, ${scope} ul { list-style: none; }`,
      `${scope} img, ${scope} svg { display: block; vertical-align: middle; }`,
      `${scope} a { color: inherit; -webkit-text-decoration: inherit; text-decoration: inherit; }`,
      `${scope} hr { height: 0; color: inherit; border-top-width: 1px; }`,
      `${scope} table { text-indent: 0; border-color: inherit; border-collapse: collapse; }`,
      `${scope}, ${scope} *, ${scope} ::before, ${scope} ::after { box-sizing: border-box; margin: 0; padding: 0; border: 0 solid var(--border, currentColor); }`,
    ]) {
      expect(style).toContain(rule)
    }
    expect(style).toMatch(
      /\.mason-design button, \.mason-design input, \.mason-design select, \.mason-design optgroup, \.mason-design textarea \{ font: inherit;[^}]*background-color: transparent;/,
    )
  })

  it('confines every reset selector beneath the design, so the page around it is untouched', () => {
    const rules = designResetCss()
      .split('\n')
      .filter((line) => /^\s+[^@\s}]/.test(line) && line.includes('{'))
    expect(rules.length).toBeGreaterThan(15)

    for (const rule of rules) {
      for (const selector of splitTop(rule.slice(0, rule.indexOf('{')), ',')) {
        expect(selector.trim().startsWith(scope)).toBe(true)
      }
    }
  })

  it('puts the reset before the design stylesheet, so the design wins', () => {
    const styles = Array.from(parse(doc).querySelectorAll('style'))
    expect(styles).toHaveLength(2)

    const [reset, own] = styles
    expect(reset.textContent).toContain(`@layer ${RESET_LAYER}`)
    expect(own.closest(scope)).not.toBeNull()
    expect(own.textContent).toContain(`${scope} p{color: red}`)
    expect(reset.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('makes image routes absolute, since a file has no origin to be relative to', () => {
    const withImage = build('<img alt="" src="/api/image/800/600/plant">')
    expect(withImage).toContain('src="https://mason.example/api/image/800/600/plant"')
    expect(withImage).toContain('pexels.com')
  })

  it('resolves the tokens the markup references', () => {
    expect(doc).toContain('--primary: #4F46E5;')
    expect(doc).toContain('fonts.googleapis.com/css2?family=Inter')
  })

  it('renders without a style guide', () => {
    const bare = build('<p>Hi</p>', null)
    expect(bare).toContain('--font-family: system-ui, sans-serif')
    expect(bare).not.toContain('fonts.googleapis.com')
  })
})

describe('designResetCss', () => {
  /**
   * Held to Tailwind's own file, not to a memory of it. Every declaration
   * preflight puts on an element the sanitiser lets through has to appear on
   * that element here, so a Tailwind upgrade that changes preflight fails
   * this test rather than quietly parting the export from the editor.
   */
  const preflight = readFileSync(resolve(process.cwd(), 'node_modules/tailwindcss/preflight.css'), 'utf8')
  const reset = designResetCss()

  /** What preflight declares in the block whose selector list starts this way. */
  const preflightDeclarations = (selectorStart: string): string[] => {
    let start = preflight.indexOf(`\n${selectorStart}`)
    // `\nsup {` also occurs inside `sub,\nsup {`. A selector list starts on a
    // line that does not continue the one before it.
    while (start > 0 && preflight[start - 1] === ',') start = preflight.indexOf(`\n${selectorStart}`, start + 1)
    expect(start, selectorStart).toBeGreaterThan(-1)
    const open = preflight.indexOf('{', start)
    const close = preflight.indexOf('}', open)
    return preflight
      .slice(open + 1, close)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(';')
      .map((declaration) => declaration.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
  }

  /** The reset's rule for these selectors. Matched from the start: the control rule contains `textarea {` too. */
  const ourRule = (selectorStart: string): string => {
    const line = reset.split('\n').find((candidate) => candidate.trimStart().startsWith(selectorStart))
    expect(line, selectorStart).toBeDefined()
    return line ?? ''
  }

  it.each([
    ['*,\n::after,', `${scope}, ${scope} *, `, ['border: 0 solid']],
    ['hr {', `${scope} hr {`, []],
    ['h1,\nh2,', `${scope} h1, `, []],
    ['a {', `${scope} a {`, []],
    ['b,\nstrong {', `${scope} b, `, []],
    ['small {', `${scope} small {`, []],
    ['sub,\nsup {', `${scope} sub, `, []],
    ['sub {', `${scope} sub {`, []],
    ['sup {', `${scope} sup {`, []],
    ['table {', `${scope} table {`, []],
    ['summary {', `${scope} summary {`, []],
    ['ol,\nul,\nmenu {', `${scope} ol, `, []],
    ['img,\nsvg,', `${scope} img, ${scope} svg {`, []],
    ['img,\nvideo {', `${scope} img {`, []],
    ['button,\ninput,\nselect,', `${scope} button, ${scope} input, `, []],
    ['textarea {', `${scope} textarea {`, []],
  ])('sets on %s what preflight sets', (selectorStart, ours, prefixes) => {
    const rule = ourRule(ours)
    for (const declaration of preflightDeclarations(selectorStart)) {
      // The border colour is the one deliberate addition: preflight's
      // `border: 0 solid` is what the application then colours `var(--border)`.
      const expected = prefixes.find((prefix) => declaration.startsWith(prefix)) ?? declaration
      expect(rule, `${ours} should carry ${declaration}`).toContain(expected)
    }
  })

  it('takes the scope it is given, for a page that renders more than one design', () => {
    const css = designResetCss('mason-design-k57')
    expect(css).toContain('.mason-design-k57 h1, ')
    expect(css).not.toContain('.mason-design h1')
  })
})
