import { describe, expect, it } from 'vitest'

import { DESIGN_SCOPE, sanitiseCss, sanitiseHtml, sanitisePartialHtml } from './sanitise'

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

/**
 * The stylesheet is what makes a generated design interactive rather than a
 * picture of an interface — an inline style cannot express :hover, :focus or
 * :checked, so without it no control can ever respond.
 *
 * It is also the widest thing the model is allowed to write, so these are
 * written as attacks. Two properties matter: a design can never style anything
 * outside itself, and it can never fetch from anywhere it should not.
 */
const scope = `.${DESIGN_SCOPE}`

describe('sanitiseCss — reach', () => {
  it('confines an ordinary selector to the design', () => {
    expect(sanitiseCss('.card { color: red }')).toBe(`${scope} .card{color: red}`)
  })

  it.each(['body', 'html', ':root'])(
    'retargets %s at the wrapper instead of the real page',
    (root) => {
      // Dropping these would leave the design unpainted — it is how a design
      // states its own page colour — but honouring them would let a generated
      // page restyle the editor around it.
      const css = sanitiseCss(`${root} { background: black }`)
      expect(css).toBe(`${scope}{background: black}`)
      expect(css.startsWith(scope)).toBe(true)
    },
  )

  it('cannot blank the application', () => {
    const css = sanitiseCss('body { display: none }')
    expect(css).not.toMatch(/(^|[^-\w])body\s*\{/)
  })

  it('scopes every selector in a list, not just the first', () => {
    expect(sanitiseCss('.a, .b { color: red }')).toBe(`${scope} .a, ${scope} .b{color: red}`)
  })

  it('scopes rules inside a media query', () => {
    expect(sanitiseCss('@media (max-width: 600px) { .a { color: red } }')).toBe(
      `@media (max-width: 600px){${scope} .a{color: red}}`,
    )
  })

  it('leaves keyframe stops alone, which are not selectors', () => {
    // Scoping these produces `.mason-design 0%`, which matches nothing and
    // silently kills every animation in the design.
    const css = sanitiseCss('@keyframes fade { 0% { opacity: 0 } 100% { opacity: 1 } }')
    expect(css).toContain('@keyframes fade')
    expect(css).not.toContain(`${scope} 0%`)
  })

  it('is not desynchronised by a brace hidden in a comment', () => {
    const css = sanitiseCss('/* } body { display:none */ .a { color: red }')
    expect(css).toBe(`${scope} .a{color: red}`)
  })
})

describe('sanitiseCss — exfiltration', () => {
  it.each([
    ['@import', '@import url("https://evil.test/x.css"); .a { color: red }', 'evil.test'],
    // Tighter than the <img> rule on purpose: a background image is a quiet
    // way to tell a third party every time a shared design is opened.
    ['an https background', '.a { background: url(https://evil.test/pixel.png) }', 'evil.test'],
    ['an http url', '.a { background: url(http://evil.test/p.png) }', 'evil.test'],
    ['legacy expression()', '.a { width: expression(alert(1)) }', 'expression'],
    ['a javascript url', '.a { background: url(javascript:alert(1)) }', 'javascript'],
    ['-moz-binding', '.a { -moz-binding: url(https://evil.test/x.xml) }', 'binding'],
  ])('drops %s', (_label, css, forbidden) => {
    expect(sanitiseCss(css).toLowerCase()).not.toContain(forbidden.toLowerCase())
  })

  it('drops only the offending declaration, keeping the rest of the rule', () => {
    const css = sanitiseCss('.a { color: red; background: url(http://evil.test/p.png); gap: 4px }')
    expect(css).toContain('color: red')
    expect(css).toContain('gap: 4px')
    expect(css).not.toContain('evil.test')
  })

  it('keeps an inline image and the app’s own photo route', () => {
    expect(sanitiseCss('.a { background: url(data:image/png;base64,iVBOR) }')).toContain('data:image/png')
    expect(sanitiseCss('.a { background: url(/api/image/800/600/plant?i=0) }')).toContain('/api/image/')
  })

  it('does not mangle a data URI on the semicolon inside it', () => {
    const css = sanitiseCss('.a { background: url("data:image/svg+xml;utf8,<svg/>"); color: red }')
    expect(css).toContain('data:image/svg+xml;utf8')
    expect(css).toContain('color: red')
  })
})

describe('interactive markup', () => {
  it('keeps a real input typeable', () => {
    const html = sanitiseHtml('<input type="text" id="email" name="email" placeholder="You">')
    expect(html).toContain('type="text"')
    expect(html).toContain('placeholder="You"')
    expect(html).toContain('id="email"')
  })

  it('keeps the label/input pairing that makes a click land', () => {
    const html = sanitiseHtml('<input type="radio" id="m48" name="memory" checked><label for="m48">48GB</label>')
    expect(html).toContain('for="m48"')
    expect(html).toContain('name="memory"')
    expect(html).toContain('checked')
  })

  it('keeps details and summary, which open with no script', () => {
    const html = sanitiseHtml('<details open><summary>More</summary><p>Body</p></details>')
    expect(html).toContain('<details')
    expect(html).toContain('<summary>')
    expect(html).toContain('open')
  })

  it('keeps a class, which is what the stylesheet selects on', () => {
    expect(sanitiseHtml('<div class="opt">x</div>')).toContain('class="opt"')
  })

  it('keeps a select and its options', () => {
    const html = sanitiseHtml('<select name="size"><option value="s" selected>Small</option></select>')
    expect(html).toContain('<select')
    expect(html).toContain('<option')
    expect(html).toContain('selected')
  })

  it('still refuses a handler on an interactive element', () => {
    // Widening the tag list must not widen what can run.
    const html = sanitiseHtml('<button onclick="steal()" onfocus="steal()">Go</button>')
    expect(html).not.toContain('steal')
    expect(html).toContain('<button')
  })

  it('sanitises the stylesheet it now allows through', () => {
    const html = sanitiseHtml('<style>body { display: none } .a:hover { color: red }</style><div class="a">x</div>')
    expect(html).toContain('<style>')
    expect(html).toContain(`${scope} .a:hover`)
    expect(html).not.toMatch(/(^|[^-\w])body\s*\{/)
  })

  it('removes a style element with nothing safe left in it', () => {
    expect(sanitiseHtml('<style>@import url("https://evil.test/x.css");</style>')).not.toContain('<style>')
  })
})
