import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ABOUT_DEFINITION } from './marketing-about'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

/**
 * The first paragraph of the page as text: the JSX tags and the `{" "}`
 * spacers stripped, whitespace collapsed the way JSX collapses it. The
 * sentence carries <Hl> highlights, so the constant cannot simply be rendered
 * in both places — this holds them together instead.
 */
const openingParagraph = (() => {
  const source = read('src/components/marketing/AboutContent.tsx')
  const intro = source.indexOf('{/* 2 — Intro */}')
  const from = source.indexOf('<p', intro)
  const to = source.indexOf('</p>', from)
  return source
    .slice(from, to)
    .replace(/<p[^>]*>/, '')
    .replace(/\{" "\}/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
})()

describe('/about-us opens by saying what SketchMason is', () => {
  /**
   * The regression this exists for. The brand SERP for "Mason" is a
   * name-collision — jars, a bricklayer, a 2016 Dribbble template — and
   * /about-us is the page Google quotes when the homepage does not win it. Its
   * first sentence was "turns the roughest thing you can draw into a finished
   * interface": a pitch, not a definition. Quoted on its own it named neither
   * the domain nor what the thing is. It carried the domain in brackets while
   * the name was "Mason"; it gives both names now — the public one, and the
   * short one the product still uses — and the name is the domain.
   */
  it('names the product under both its names, what goes in and what comes out', () => {
    expect(ABOUT_DEFINITION).toMatch(/^SketchMason, or Mason for short, turns rough sketches/)
    expect(ABOUT_DEFINITION).toMatch(/user interfaces, design systems, and flows\.$/)
  })

  it('is the sentence the page actually starts with', () => {
    expect(openingParagraph.startsWith(ABOUT_DEFINITION)).toBe(true)
  })

  it('is the meta description too, so the snippet and the page agree', () => {
    expect(read('src/app/(marketing)/about-us/page.tsx')).toMatch(/description: ABOUT_DEFINITION,/)
  })

  /** The content law in marketing-faq.ts: nothing a deployment can move. */
  it('quotes no price and no figure', () => {
    expect(ABOUT_DEFINITION).not.toMatch(/[$£€]|\d/)
  })

  /** Past about a hundred and sixty characters a result shows an ellipsis. */
  it('fits a search snippet whole', () => {
    expect(ABOUT_DEFINITION.length).toBeLessThanOrEqual(160)
  })
})
