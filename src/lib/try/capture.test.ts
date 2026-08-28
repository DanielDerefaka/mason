import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildSvg,
  captureDesignPng,
  collectImageSources,
  inlineCssUrls,
  keepLatinFaces,
} from './capture'

const DATA = 'data:image/png;base64,AAAA'

describe('inlineCssUrls', () => {
  it('rewrites each url() to the data URI the resolver returns, quoted or bare', async () => {
    const css = `a{background:url(/one.png)} b{background:url("/two.png") no-repeat}`
    const out = await inlineCssUrls(css, async (url) => `${DATA}#${url}`)

    expect(out).toBe(
      `a{background:url("${DATA}#/one.png")} b{background:url("${DATA}#/two.png") no-repeat}`,
    )
  })

  it('leaves data: and fragment references alone without asking the resolver', async () => {
    const resolver = vi.fn(async () => DATA)
    const css = `a{background:url(${DATA})} b{filter:url(#blur)}`

    expect(await inlineCssUrls(css, resolver)).toBe(css)
    expect(resolver).not.toHaveBeenCalled()
  })

  it('keeps the original reference when the resolver answers null or throws', async () => {
    const css = `a{background:url(/gone.png)} b{background:url(/broken.png)}`
    const out = await inlineCssUrls(css, async (url) => {
      if (url === '/broken.png') throw new Error('network')
      return null
    })

    expect(out).toBe(css)
  })

  it('returns a sheet with no urls untouched', async () => {
    const css = 'a{color:red}'
    expect(await inlineCssUrls(css, async () => DATA)).toBe(css)
  })
})

describe('collectImageSources', () => {
  it('lists each fetchable src once and skips images that are already inline', () => {
    const root = document.createElement('div')
    root.innerHTML =
      `<img src="/a.png"><img src="/a.png"><img src="${DATA}"><img><img src="/b.png">`

    expect(collectImageSources(root)).toEqual(['/a.png', '/b.png'])
  })
})

describe('keepLatinFaces', () => {
  const sheet = [
    '/* cyrillic */',
    '@font-face { font-family: X; src: url(/cyr.woff2); }',
    '/* latin-ext */',
    '@font-face { font-family: X; src: url(/ext.woff2); }',
    '/* latin */',
    '@font-face { font-family: X; src: url(/latin.woff2); }',
    '/* latin */',
    '@font-face { font-family: X; font-weight: 700; src: url(/latin-bold.woff2); }',
  ].join('\n')

  it('keeps only the latin faces of a Google Fonts sheet', () => {
    const kept = keepLatinFaces(sheet)

    expect(kept).toContain('/latin.woff2')
    expect(kept).toContain('/latin-bold.woff2')
    expect(kept).not.toContain('/cyr.woff2')
    expect(kept).not.toContain('/ext.woff2')
  })

  it('returns a sheet without subset comments whole', () => {
    const css = '@font-face { font-family: Y; src: url(/y.woff2); }'
    expect(keepLatinFaces(css)).toBe(css)
  })
})

describe('buildSvg', () => {
  it('wraps the markup in a foreignObject with the XHTML namespace, scaled by viewBox', () => {
    const svg = buildSvg({
      markup: '<p>hi</p>',
      width: 1200,
      height: 630,
      viewWidth: 1280,
      viewHeight: 672,
    })

    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('width="1200" height="630"')
    expect(svg).toContain('viewBox="0 0 1280 672"')
    expect(svg).toContain('<foreignObject x="0" y="0" width="1280" height="672">')
    expect(svg).toContain('<div xmlns="http://www.w3.org/1999/xhtml"')
    expect(svg).toContain('<p>hi</p>')
  })
})

describe('captureDesignPng', () => {
  afterEach(() => vi.restoreAllMocks())

  it('resolves null rather than throwing where the canvas cannot draw', async () => {
    // jsdom has no 2D context; a browser that taints the canvas ends up in the
    // same place. The share must still go out, just without its card.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const node = document.createElement('div')
    node.className = 'mason-design'
    node.innerHTML = '<section>hi</section>'
    document.body.append(node)

    await expect(captureDesignPng(node)).resolves.toBeNull()
  })
})
