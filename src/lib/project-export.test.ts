import { describe, expect, it } from 'vitest'

import { elementToJsx, escapeText } from './html-to-jsx'
import { buildProject, identifier } from './project-export'
import type { Shape } from '@/redux/slice/shapes'
import type { StyleGuide } from '@/types/style-guide'

/**
 * The project export's whole promise is that what comes out compiles and looks
 * like what went in. The compiling half is checked by building a real exported
 * project by hand; what is here is everything decidable without npm — the JSX
 * conversion, the file layout, and the component split.
 */
const mount = (html: string) => {
  const host = document.createElement('div')
  host.innerHTML = html
  return host.firstElementChild as HTMLElement
}

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
  typeScale: [
    { name: 'Display', fontSize: 56, fontWeight: 700, lineHeight: 1.05, letterSpacing: -0.02, usage: 'Hero' },
  ],
  radii: [{ name: 'Medium', value: 12 }],
} as unknown as StyleGuide

const build = (html: string) =>
  buildProject(design(html), guide, { origin: 'https://mason.example' })

const file = (files: { path: string; content: string }[], path: string) =>
  files.find((entry) => entry.path === path)?.content ?? ''

describe('escapeText', () => {
  it('escapes what would otherwise open an expression or an element', () => {
    expect(escapeText('5 < 6 and {this}')).toBe("5 {'<'} 6 and {'{'}this{'}'}")
  })

  it('escapes a non-breaking space, which is invisible in a source file', () => {
    expect(escapeText('All rights')).toBe("All{'\\u00a0'}rights")
  })
})

describe('elementToJsx', () => {
  it('renames the attributes React spells differently', () => {
    const jsx = elementToJsx(mount('<label class="a" for="email">Email</label>'))

    expect(jsx).toContain('className="a"')
    expect(jsx).toContain('htmlFor="email"')
  })

  it('self-closes a void element, which JSX will not accept otherwise', () => {
    expect(elementToJsx(mount('<img alt="a" src="/x.png">'))).toContain('/>')
    expect(elementToJsx(mount('<div><br></div>'))).toContain('<br />')
  })

  it('keeps the case of an SVG attribute', () => {
    // `viewbox` is not `viewBox` to React, and the DOM lowercases it on the
    // way in — so it has to be put back.
    const jsx = elementToJsx(mount('<svg viewBox="0 0 24 24" stroke-width="2"><path d="M0 0"/></svg>'))

    expect(jsx).toContain('viewBox="0 0 24 24"')
    expect(jsx).toContain('strokeWidth="2"')
  })

  it('writes a boolean attribute as a bare prop', () => {
    expect(elementToJsx(mount('<input type="checkbox" checked>'))).toContain('checked')
  })

  it('drops the editor bookkeeping', () => {
    const jsx = elementToJsx(mount('<div data-mason-name="Hero" data-mason-locked=""><p>a</p></div>'))

    expect(jsx).not.toContain('data-mason')
  })

  it('does not repeat a class the translation also produced', () => {
    expect(elementToJsx(mount('<div class="grid" style="display:grid"><p>a</p></div>'))).toContain(
      'className="grid"',
    )
  })

  it('references a nested component rather than writing it out twice', () => {
    const jsx = elementToJsx(
      mount('<section><div data-mason-component="Card"><p>a</p></div></section>'),
      { boundary: (element) => element.getAttribute('data-mason-component') },
    )

    expect(jsx).toContain('<Card />')
    expect(jsx).not.toContain('<p>a</p>')
  })

  it('never renders a component as a reference to itself', () => {
    // The boundary is asked of everything except the element the render
    // started from; without that exception this recurses until the stack ends.
    const jsx = elementToJsx(mount('<div data-mason-component="Card"><p>a</p></div>'), {
      boundary: (element) => element.getAttribute('data-mason-component'),
    })

    expect(jsx).not.toContain('<Card />')
    expect(jsx).toContain('<p>a</p>')
  })
})

describe('identifier', () => {
  it.each([
    ['Ship the interface', 'ShipTheInterface'],
    ['pricing', 'Pricing'],
    ['24/7 support', 'Section247Support'],
    ['', 'Section'],
    ['Wat—now?', 'WatNow'],
  ])('turns %s into a component name', (input, expected) => {
    expect(identifier(input)).toBe(expected)
  })
})

describe('buildProject', () => {
  const files = build(
    '<div style="background:var(--background)">' +
      '<header data-mason-component="Site nav" style="display:flex"><a href="#">Home</a></header>' +
      '<section><h1>Plans</h1><p>Simple pricing.</p></section>' +
      '<section><div data-mason-component="Site nav" style="display:flex"><a href="#">Home</a></div></section>' +
      '</div>',
  )

  it('writes a project that npm can install and next can run', () => {
    for (const path of [
      'package.json',
      'tsconfig.json',
      'next.config.ts',
      'postcss.config.mjs',
      'app/layout.tsx',
      'app/page.tsx',
      'app/globals.css',
      'README.md',
    ]) {
      expect(files.map((entry) => entry.path)).toContain(path)
    }
  })

  it('emits one file per component, however many times it appears', () => {
    const components = files.filter((entry) => entry.path.startsWith('components/'))

    expect(components.filter((entry) => entry.path === 'components/SiteNav.tsx')).toHaveLength(1)
    expect(file(files, 'app/page.tsx')).toContain("import { SiteNav } from '@/components/SiteNav'")
  })

  it('names a section after its own heading', () => {
    expect(files.map((entry) => entry.path)).toContain('components/Plans.tsx')
  })

  it('defines the palette twice, on purpose', () => {
    const css = file(files, 'app/globals.css')

    // On the root because the markup references var(--primary) directly, and
    // in the theme because that is what makes bg-primary exist.
    expect(css).toContain('--primary: #4F46E5;')
    expect(css).toContain('--color-primary: var(--primary);')
    expect(css).toContain('@import "tailwindcss";')
  })

  it('carries the design stylesheet across, rescoped to the exported wrapper', () => {
    const withSheet = build(
      '<div><style>.mason-design .cta:hover { opacity: .8 }</style><section><h1>A</h1></section></div>',
    )

    expect(file(withSheet, 'app/globals.css')).toContain('.page .cta:hover')
    // A <style> tag in the middle of a component would not survive the build.
    expect(file(withSheet, 'components/A.tsx')).not.toContain('<style')
  })

  it('makes image routes absolute, since a project has no origin to be relative to', () => {
    const withImage = build('<div><section><img alt="" src="/api/image/x"></section></div>')

    expect(files.concat(withImage).some((entry) => entry.content.includes('https://mason.example/api/image/x'))).toBe(true)
  })

  it('still produces a page that runs when the design has no sections', () => {
    const empty = build('<div><p>Just this.</p></div>')

    expect(file(empty, 'app/page.tsx')).toContain('export default Page')
  })
})
