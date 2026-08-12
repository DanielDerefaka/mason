import { describe, expect, it } from 'vitest'

import { buildDesignPrompt } from './prompt-export'
import type { Shape } from '@/redux/slice/shapes'
import type { StyleGuide } from '@/types/style-guide'

/**
 * The HTML export hands over a finished artefact; this hands over the
 * instructions. Its whole value is that every value is measured rather than
 * described — a builder that has to guess a colour has been failed by it.
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
  description: 'Restrained, high contrast, built around one accent.',
  colorSections: [
    {
      title: 'Core',
      swatches: [
        { name: 'Background', token: '--background', color: '#0a0a0a' },
        { name: 'Primary', token: '--primary', color: '#4F46E5', description: 'Actions only' },
      ],
    },
  ],
  typography: { fontFamily: 'Inter, sans-serif', styles: [{ name: 'Bold', weight: 700 }] },
  typeScale: [
    { name: 'Display', fontSize: 56, fontWeight: 700, lineHeight: 1.05, letterSpacing: -0.02, usage: 'Hero' },
  ],
  radii: [{ name: 'Medium', value: 12 }, { name: 'Pill', value: 9999 }],
} as unknown as StyleGuide

describe('buildDesignPrompt', () => {
  const prompt = buildDesignPrompt(
    design('<div><section><h1>Plans</h1><p>Simple pricing.</p><button>Buy</button><img src="/a.png"></section><footer><a href="#">Terms</a></footer></div>'),
    guide,
  )

  it('states colours as tokens and hex, not as adjectives', () => {
    expect(prompt).toContain('--primary')
    expect(prompt).toContain('#4F46E5')
    expect(prompt).toContain('Actions only')
  })

  it('carries the type scale as numbers', () => {
    expect(prompt).toContain('Inter')
    expect(prompt).toContain('56px')
    expect(prompt).toContain('1.05')
  })

  it('spells a pill radius out rather than leaving 9999 to be read as pixels', () => {
    expect(prompt).toContain('fully rounded')
    expect(prompt).toContain('12px')
  })

  it('outlines the page top to bottom, with what each section is made of', () => {
    expect(prompt).toContain('Plans')
    expect(prompt).toContain('1 button')
    expect(prompt).toContain('1 image')
  })

  it('reads only the outermost run, not every card on the page', () => {
    // Descending further produces an outline of the components, not the page.
    const outline = prompt.slice(prompt.indexOf('## Page structure'), prompt.indexOf('## How to build it'))
    expect(outline.match(/^\d+\. /gm)?.length).toBe(2)
  })

  it('names the framework it is asking for', () => {
    expect(prompt).toContain('Next.js')
    expect(prompt).toContain('Tailwind')
  })

  it('includes the markup as reference and says not to paste it', () => {
    expect(prompt).toContain('```html')
    expect(prompt).toContain('do not')
  })

  it('still produces a usable brief with no style guide', () => {
    const bare = buildDesignPrompt(design('<div><section><h1>Hi</h1></section></div>'), null)
    expect(bare).toContain('No style guide was attached')
    expect(bare).toContain('## How to build it')
  })
})
