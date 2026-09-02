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
    const jsx = elementToJsx(
      mount(
        '<svg viewBox="0 0 24 24" stroke-width="2"><path d="M0 0" fill-rule="evenodd" fill-opacity=".5"/><use xlink:href="#a"/></svg>',
      ),
    )

    expect(jsx).toContain('viewBox="0 0 24 24"')
    expect(jsx).toContain('strokeWidth="2"')
    // The attributes the sanitiser now keeps have to come out spelt the way
    // React spells them, or the project warns on every icon.
    expect(jsx).toContain('fillRule="evenodd"')
    expect(jsx).toContain('fillOpacity=".5"')
    expect(jsx).toContain('xlinkHref="#a"')
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
    // The boundary returns the whole reference, props and all, so a repeated
    // shape can arrive as `<NavLink label="Home" />`.
    const jsx = elementToJsx(
      mount('<section><div data-mason-component="Card"><p>a</p></div></section>'),
      { boundary: (element) => (element.hasAttribute('data-mason-component') ? '<Card />' : null) },
    )

    expect(jsx).toContain('<Card />')
    expect(jsx).not.toContain('<p>a</p>')
  })

  it('never renders a component as a reference to itself', () => {
    // The boundary is asked of everything except the element the render
    // started from; without that exception this recurses until the stack ends.
    const jsx = elementToJsx(mount('<div data-mason-component="Card"><p>a</p></div>'), {
      boundary: (element) => (element.hasAttribute('data-mason-component') ? '<Card />' : null),
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

  it('does not put a whole page in one component called Div', () => {
    /**
     * What a real export produced: the design's body was `[<style>, <div>]`,
     * which the old reading counted as two children and so never descended
     * past — and it only descended one level anyway, while a generated design
     * nests two or three wrappers before the content starts. Every section of
     * the page came out inside a single 300-line `Div.tsx`.
     */
    const real = build(
      '<style>.mason-design .cta:hover{opacity:.8}</style>' +
        '<div class="page-root">' +
        '<div class="inner">' +
        '<header><nav><a href="#">Home</a></nav></header>' +
        '<section><h2>Services</h2><p>What we do.</p></section>' +
        '<section><h2>Work</h2><p>Selected projects.</p></section>' +
        '<footer><p>© 2026</p></footer>' +
        '</div></div>',
    )

    const components = real
      .filter((entry) => entry.path.startsWith('components/'))
      .map((entry) => entry.path)

    expect(components).not.toContain('components/Div.tsx')
    expect(components).toEqual(
      expect.arrayContaining([
        'components/SiteHeader.tsx',
        'components/Services.tsx',
        'components/Work.tsx',
        'components/SiteFooter.tsx',
      ]),
    )
  })

  it('names a landmark rather than its tag, and a plain wrapper by position', () => {
    const named = build(
      '<div><nav><a href="#">Home</a></nav>' +
        '<div><p>no heading here</p><p>nor here</p></div>' +
        '<footer><p>©</p></footer></div>',
    )

    const paths = named.map((entry) => entry.path)
    expect(paths).toContain('components/SiteNav.tsx')
    expect(paths).toContain('components/Section2.tsx')
    expect(paths).toContain('components/SiteFooter.tsx')
  })

  it('turns a repeated shape into one component taking props', () => {
    /**
     * The complaint this answers: a section that draws the same card three
     * times was exported as that card written out three times. What varies
     * between the instances is content, so it becomes props.
     */
    const cards = build(
      '<div><section><h2>Features</h2><div class="grid">' +
        '<div class="card"><h3>Fast</h3><p>Draw it.</p></div>' +
        '<div class="card"><h3>Faithful</h3><p>Your palette.</p></div>' +
        '<div class="card"><h3>Yours</h3><p>Export it.</p></div>' +
        '</div></section></div>',
    )

    const card = file(cards, 'components/FeatureCard.tsx')
    expect(card).toContain('export const FeatureCard = ({ title, body }: { title: string; body: string })')
    expect(card).toContain('>{title}<')
    expect(card).toContain('>{body}<')
    // Written once, not three times.
    expect(card).not.toContain('Faithful')

    const section = file(cards, 'components/Features.tsx')
    expect(section).toContain("import { FeatureCard } from './FeatureCard'")
    expect(section).toContain('<FeatureCard title="Fast" body="Draw it." />')
    expect(section).toContain('<FeatureCard title="Yours" body="Export it." />')
  })

  it('makes a prop of an attribute that varies, so links still go somewhere', () => {
    const nav = build(
      '<div><nav><a href="#home">Home</a><a href="#work">Work</a><a href="#about">About</a></nav>' +
        '<section><h2>Body</h2></section></div>',
    )

    const link = file(nav, 'components/NavLink.tsx')
    expect(link).toContain('{ label, href }: { label: string; href: string }')
    expect(link).toContain('href={href}')
    expect(file(nav, 'components/SiteNav.tsx')).toContain('<NavLink label="Home" href="#home" />')
  })

  it('leaves a shape that appears once written where it is', () => {
    const once = build('<div><section><h2>Solo</h2><div class="card"><p>only one</p></div></section></div>')

    expect(once.map((entry) => entry.path)).not.toContain('components/Card.tsx')
    expect(file(once, 'components/Solo.tsx')).toContain('only one')
  })

  it('still produces a page that runs when the design has no sections', () => {
    const empty = build('<div><p>Just this.</p></div>')

    expect(file(empty, 'app/page.tsx')).toContain('export default Page')
  })
})
