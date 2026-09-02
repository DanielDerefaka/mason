import { describe, expect, it } from 'vitest'

import { prompts } from '.'

/**
 * A node edit used to see the element and nothing else: not the stylesheet
 * its hover and breakpoint rules live in, not the grid it sits in, not the
 * dark section behind it. Told "no class names" by the output rules, the
 * model dropped the class the breakpoints hung off and the section stopped
 * collapsing on a phone. The user message now carries both, marked as
 * reference, and says in so many words to keep the attributes.
 */
describe('prompts.node.user', () => {
  const element = '<div class="grid-3"><article>One</article></div>'

  it('renders the stylesheet as reference, not as something to return', () => {
    const message = prompts.node.user('round the corners', element, {
      stylesheet: '.grid-3 { display: grid }',
    })

    expect(message).toContain("The page's stylesheet, for reference only, do not return it:")
    expect(message).toContain('.grid-3 { display: grid }')
  })

  it('says where the element sits', () => {
    const message = prompts.node.user('round the corners', element, {
      ancestors: 'section.dark (background:#111) > div.grid-3 (display:grid; gap:24px) > [this]',
    })

    expect(message).toContain(
      'Where the element sits: section.dark (background:#111) > div.grid-3 (display:grid; gap:24px) > [this]',
    )
  })

  it('tells the model to keep the attributes the stylesheet selects by', () => {
    expect(prompts.node.user('round the corners', element)).toContain(
      'Keep every class, id, for and name attribute the element and its descendants already carry.',
    )
  })

  it('still works with no context at all', () => {
    const message = prompts.node.user('round the corners', element)

    expect(message).toContain('Requested change: round the corners')
    expect(message).toContain(element)
    expect(message).not.toContain('stylesheet')
    expect(message).not.toContain('Where the element sits')
  })

  it('leaves out a context field that is blank', () => {
    const message = prompts.node.user('round the corners', element, {
      stylesheet: '   ',
      ancestors: '',
    })

    expect(message).not.toContain('stylesheet')
    expect(message).not.toContain('Where the element sits')
  })
})
