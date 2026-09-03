import { describe, expect, it } from 'vitest'

import { exploreTitle, headlineOf } from './title'

const item = (html: string, patch: { label?: string; instruction?: string | null } = {}) => ({
  label: 'MacBook Air',
  instruction: null,
  html,
  ...patch,
})

/**
 * The regression this exists for: the Explore card was titled with the
 * design's label, which is the frame's, which is the preset it was made at.
 * The gallery read "MacBook Air", "MacBook Air", "iPhone 16".
 */
describe('titling an Explore card', () => {
  it('reads the design headline', () => {
    expect(exploreTitle(item('<section><h1>Ship faster with Acme</h1></section>'))).toBe(
      'Ship faster with Acme',
    )
  })

  it('takes the first h1 whatever its attributes, and drops the markup inside it', () => {
    const html = '<h1 class="x" style="font-size:3rem">Plan <em>less</em>,<br>do more</h1><h1>Second</h1>'
    expect(headlineOf(html)).toBe('Plan less, do more')
  })

  it('decodes the entities a headline carries', () => {
    expect(headlineOf('<h1>Bread &amp; Butter &#169; est.&nbsp;1999 &#x27;24</h1>')).toBe(
      "Bread & Butter © est. 1999 '24",
    )
  })

  it('falls back to the instruction when the design has no headline', () => {
    expect(exploreTitle(item('<div>logo</div>', { instruction: ' A pricing page ' }))).toBe(
      'A pricing page',
    )
  })

  it('treats an empty h1 as no headline', () => {
    expect(headlineOf('<h1><svg></svg></h1>')).toBeNull()
    expect(exploreTitle(item('<h1> </h1>', { instruction: 'Settings' }))).toBe('Settings')
  })

  it('keeps the label when there is neither, so an old row reads as it did', () => {
    expect(exploreTitle(item('<p>no heading</p>'))).toBe('MacBook Air')
    expect(exploreTitle(item('', { instruction: '  ' }))).toBe('MacBook Air')
  })

  it('cuts a long headline where the title row would', () => {
    const title = headlineOf(`<h1>${'word '.repeat(30)}</h1>`) ?? ''
    expect(title.length).toBeLessThanOrEqual(60)
    expect(title.endsWith('…')).toBe(true)
  })

  it('is not fooled by a heading that only looks like one', () => {
    expect(headlineOf('<h10>Not it</h10><h1>Right</h1>')).toBe('Right')
  })
})
