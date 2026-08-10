import { describe, expect, it } from 'vitest'

import { sanitiseHtml, sanitisePartialHtml } from './sanitise'

/**
 * The sanitiser stands between model output and dangerouslySetInnerHTML, and
 * every design in the product goes through it. It is the one piece of this
 * codebase where a gap is a cross-site scripting hole rather than a layout bug,
 * so the tests are written as attacks rather than as examples.
 */
describe('sanitiseHtml — what it must remove', () => {
  it.each([
    ['a script tag', '<div><script>alert(1)</script></div>', 'alert'],
    ['an inline handler', '<button onclick="alert(1)">Go</button>', 'onclick'],
    ['an error handler on a broken image', '<img src="x" onerror="alert(1)">', 'onerror'],
    ['a javascript: link', '<a href="javascript:alert(1)">Go</a>', 'javascript:'],
    ['an iframe', '<iframe src="https://evil.test"></iframe>', 'iframe'],
    ['an object embed', '<object data="x.swf"></object>', 'object'],
    ['a style element', '<style>body{display:none}</style>', 'display:none'],
    ['a form', '<form action="https://evil.test"><input></form>', 'evil.test'],
    ['a base tag', '<base href="https://evil.test">', 'base'],
  ])('removes %s', (_label, input, forbidden) => {
    expect(sanitiseHtml(input).toLowerCase()).not.toContain(forbidden.toLowerCase())
  })

  it('removes a handler however it is cased, since attributes are case-insensitive', () => {
    expect(sanitiseHtml('<div OnClIcK="alert(1)">x</div>')).not.toContain('alert')
  })

  it('removes a handler on an element that is otherwise allowed', () => {
    const html = sanitiseHtml('<section onmouseover="steal()"><p>Copy</p></section>')
    expect(html).not.toContain('steal')
    expect(html).toContain('<p>Copy</p>')
  })

  it('rejects a non-image data URL while keeping inline images', () => {
    expect(sanitiseHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>')).not.toContain(
      'data:text/html',
    )
    expect(sanitiseHtml('<img src="data:image/png;base64,iVBORw0KGgo=">')).toContain(
      'data:image/png',
    )
  })

  it('rejects http, so a design cannot mix content into an https page', () => {
    expect(sanitiseHtml('<img src="http://evil.test/a.png">')).not.toContain('http://')
  })

  it('does not lose the sibling after a removed node', () => {
    // A live NodeList mutated while walking skips elements; this is the case
    // that catches it.
    const html = sanitiseHtml('<div><script>x</script><p>one</p><p>two</p></div>')
    expect(html).toContain('one')
    expect(html).toContain('two')
  })
})

describe('sanitiseHtml — what it must keep', () => {
  it('keeps inline styles, which are the entire design system', () => {
    const html = sanitiseHtml('<div style="display: flex; gap: 24px">x</div>')
    expect(html).toContain('display: flex')
  })

  it('keeps CSS variables, which is how a design references the style guide', () => {
    const html = sanitiseHtml('<div style="color: var(--primary)">x</div>')
    expect(html).toContain('var(--primary)')
  })

  it('keeps an inline SVG icon intact', () => {
    const html = sanitiseHtml(
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M4 12h16" stroke="currentColor" stroke-width="2"/></svg>',
    )
    expect(html).toContain('<path')
    expect(html).toContain('M4 12h16')
    expect(html).toContain('stroke-width')
  })

  it('keeps anchors, relative links and fragments', () => {
    expect(sanitiseHtml('<a href="https://mason.test">x</a>')).toContain('https://mason.test')
    expect(sanitiseHtml('<a href="/pricing">x</a>')).toContain('/pricing')
    expect(sanitiseHtml('<a href="#features">x</a>')).toContain('#features')
  })

  it('keeps accessibility attributes', () => {
    const html = sanitiseHtml('<button aria-label="Close" role="button">x</button>')
    expect(html).toContain('aria-label')
    expect(html).toContain('role')
  })

  it('leaves clean markup byte-identical', () => {
    const clean = '<section style="padding: 40px"><h1>Title</h1><p>Body</p></section>'
    expect(sanitiseHtml(clean)).toBe(clean)
  })
})

describe('sanitisePartialHtml', () => {
  it('closes a tag cut off mid-stream instead of dropping the content', () => {
    const html = sanitisePartialHtml('<section><h1>Half a hea')
    expect(html).toContain('Half a hea')
    expect(html).toContain('</section>')
  })

  it('strips a markdown fence the model opened with', () => {
    expect(sanitisePartialHtml('```html\n<p>Hi</p>')).toBe('<p>Hi</p>')
  })

  it('drops orphan attributes left by a chunk boundary inside a tag', () => {
    // Without this the page renders `style="width:100%">` as visible text
    // across the top of the design.
    const html = sanitisePartialHtml('style="width: 100%; display: flex"><p>Body</p>')
    expect(html).not.toContain('width: 100%')
    expect(html).toContain('<p>Body</p>')
  })

  it('leaves real copy that merely contains an equals sign', () => {
    const html = sanitisePartialHtml('Plans start at 2 = 1 <p>More</p>')
    expect(html).toContain('Plans start at')
  })

  it('still removes scripts in a partial stream', () => {
    expect(sanitisePartialHtml('<div><script>alert(1)')).not.toContain('alert')
  })
})

describe('comments', () => {
  it('drops model commentary, which travels with a shared or exported design', () => {
    const html = sanitiseHtml('<p>Body</p><!-- I was unsure about this section -->')
    expect(html).toBe('<p>Body</p>')
  })

  it('drops a comment nested inside the tree, not only at the top level', () => {
    expect(sanitiseHtml('<div><!-- note --><p>Body</p></div>')).toBe('<div><p>Body</p></div>')
  })
})
