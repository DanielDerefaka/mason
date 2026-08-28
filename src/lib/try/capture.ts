/**
 * A PNG of a design, taken in the browser with nothing installed.
 *
 * The share card and the Explore gallery want a picture of a design, and the
 * design is a `div.mason-design` full of markup — there is no image of it
 * anywhere. The browser can paint HTML into a canvas only by way of an SVG
 * `<foreignObject>`, and an SVG loaded as an image fetches nothing: every
 * picture and font it needs has to already be inside it as a data URI. That is
 * what most of this file does. The alternative was html-to-image, which does
 * the same thing behind a dependency this project would rather not carry for
 * one call.
 *
 * Nothing here throws to the caller. A share still works without its preview
 * card, so every failure — a photograph that will not fetch, a font that will
 * not inline, a browser that taints the canvas (Safari does, for any SVG with
 * a foreignObject) — degrades to a missing image rather than a broken share.
 */
export type CaptureSize = { width: number; height: number }

/** Turns a URL into a data URI, or null when it cannot be had. Never throws. */
export type UrlResolver = (url: string) => Promise<string | null>

/** Retina, and the size Twitter's card renderer resamples from. */
const SCALE = 2

/** What the canvas measures a design at when it has not been laid out yet. */
const FALLBACK_WIDTH = 1280

/** An SVG image that never fires `load` would otherwise hang the caller forever. */
const LOAD_TIMEOUT = 20_000

const XHTML = 'http://www.w3.org/1999/xhtml'

/**
 * `url(...)` in CSS, quoted or bare. The body excludes brackets and quotes so
 * `url(a) url(b)` is two matches rather than one greedy one.
 */
const CSS_URL = /url\(\s*(['"]?)([^'"()]+?)\1\s*\)/g

/** Already inline, or not a resource at all — nothing to fetch. */
const isInline = (url: string) => /^(data:|#)/i.test(url.trim())

/**
 * Rewrites every fetchable `url()` in a stylesheet to whatever the resolver
 * returns for it. A resolver that answers null or throws leaves that one
 * reference exactly as it was: a single unreachable picture must not cost the
 * rest of the sheet.
 */
export const inlineCssUrls = async (css: string, resolve: UrlResolver): Promise<string> => {
  const matches = Array.from(css.matchAll(CSS_URL))
  if (matches.length === 0) return css

  const resolved = await Promise.all(
    matches.map(async (match) => {
      const url = match[2].trim()
      if (isInline(url)) return null
      try {
        return await resolve(url)
      } catch {
        return null
      }
    }),
  )

  let out = ''
  let cursor = 0
  matches.forEach((match, index) => {
    const start = match.index ?? 0
    out += css.slice(cursor, start)
    out += resolved[index] ? `url("${resolved[index]}")` : match[0]
    cursor = start + match[0].length
  })
  return out + css.slice(cursor)
}

/** Every distinct `<img src>` under a node that would need fetching. */
export const collectImageSources = (root: ParentNode): string[] => {
  const sources = new Set<string>()
  for (const image of Array.from(root.querySelectorAll('img'))) {
    const src = image.getAttribute('src')?.trim()
    if (src && !isInline(src)) sources.add(src)
  }
  return Array.from(sources)
}

/**
 * Keeps only the Latin faces of a Google Fonts sheet.
 *
 * Google answers with one `@font-face` per script — Cyrillic, Greek,
 * Vietnamese and so on — each pulling its own file. Inlined, that is several
 * hundred kilobytes per weight for glyphs no design here uses, and the data
 * URL grows past what some browsers will decode as an image. Google marks
 * each block with a comment naming the subset, which is what this reads. A
 * sheet without those comments is not Google's and is returned whole.
 */
export const keepLatinFaces = (css: string): string => {
  if (!css.includes('/* latin */')) return css
  const blocks = css.split(/(?=\/\*\s*[\w-]+\s*\*\/\s*@font-face)/)
  return blocks.filter((block) => /^\/\*\s*latin\s*\*\//.test(block.trim())).join('\n')
}

/**
 * The SVG that carries the markup. The viewBox is the design's own width and
 * the matching slice of its height, so the drawing scales to the requested
 * size rather than being cropped at it; `overflow: hidden` on the wrapper
 * stops the rest of a tall page painting past the foreignObject.
 */
export const buildSvg = ({
  markup,
  width,
  height,
  viewWidth,
  viewHeight,
}: CaptureSize & { markup: string; viewWidth: number; viewHeight: number }): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
  `viewBox="0 0 ${viewWidth} ${viewHeight}">` +
  `<foreignObject x="0" y="0" width="${viewWidth}" height="${viewHeight}">` +
  `<div xmlns="${XHTML}" style="width:${viewWidth}px;height:${viewHeight}px;overflow:hidden;margin:0">` +
  markup +
  `</div></foreignObject></svg>`

const blobToDataUrl = (blob: Blob): Promise<string | null> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })

/**
 * One fetch per URL for the whole capture, because a design repeats its
 * pictures — the same photograph in a card grid, the same icon in a list —
 * and a font file is referenced by every weight that maps to it.
 */
const makeResolver = (): UrlResolver => {
  const cache = new Map<string, Promise<string | null>>()
  return (url) => {
    let absolute: string
    try {
      absolute = new URL(url, document.baseURI).href
    } catch {
      return Promise.resolve(null)
    }
    const hit = cache.get(absolute)
    if (hit) return hit

    const pending = (async () => {
      try {
        const response = await fetch(absolute, { mode: 'cors' })
        if (!response.ok) return null
        return await blobToDataUrl(await response.blob())
      } catch {
        return null
      }
    })()
    cache.set(absolute, pending)
    return pending
  }
}

/**
 * CSS custom properties set inline on the node's ancestors, nearest first.
 *
 * The design's colours are `var(--primary)` and friends, bound as inline
 * variables on the wrapper the canvas renders it in — outside the node, so a
 * clone of the node alone renders every token as its fallback. Copying the
 * declarations onto the clone is cheaper than serialising the ancestors.
 */
const customPropertiesAbove = (node: HTMLElement): Map<string, string> => {
  const found = new Map<string, string>()
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    for (let index = 0; index < parent.style.length; index += 1) {
      const name = parent.style[index]
      if (name.startsWith('--') && !found.has(name)) {
        found.set(name, parent.style.getPropertyValue(name))
      }
    }
  }
  return found
}

/**
 * The guide's font, inlined. The canvas loads it through one
 * `<link data-style-guide-font>` (see `useGoogleFont`); its stylesheet is
 * fetched, cut down to the Latin faces and every file it names turned into
 * a data URI. Google serves both with CORS headers, so this works from any
 * origin — and when it does not, the capture goes out in the fallback face.
 */
const inlineFontStylesheet = async (resolve: UrlResolver): Promise<string | null> => {
  const link = document.head.querySelector<HTMLLinkElement>('link[data-style-guide-font]')
  if (!link?.href) return null
  try {
    const response = await fetch(link.href, { mode: 'cors' })
    if (!response.ok) return null
    return await inlineCssUrls(keepLatinFaces(await response.text()), resolve)
  } catch {
    return null
  }
}

const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image()
    const timer = setTimeout(() => resolve(null), LOAD_TIMEOUT)
    image.onload = () => {
      clearTimeout(timer)
      resolve(image)
    }
    image.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    image.src = src
  })

const isOpaque = (color: string) =>
  Boolean(color) && color !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(color)

/**
 * The top `width × height` of a design as a PNG at 2×, or null.
 *
 * Null covers everything that can go wrong: no 2D context, markup the XML
 * parser will not take, an image that never loads, and a canvas the browser
 * has tainted — which `toBlob` reports by throwing, and is the case this
 * catches rather than lets out.
 */
export const captureDesignPng = async (
  node: HTMLElement,
  size: CaptureSize = { width: 1200, height: 630 },
): Promise<Blob | null> => {
  try {
    // Asked for first: an environment without a canvas has no use for the
    // fetching that follows.
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(size.width * SCALE)
    canvas.height = Math.round(size.height * SCALE)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const viewWidth = node.offsetWidth || node.getBoundingClientRect().width || FALLBACK_WIDTH
    const viewHeight = (viewWidth * size.height) / size.width

    const clone = node.cloneNode(true) as HTMLElement
    const computed = getComputedStyle(node)
    // Inherited from the page on screen, from nowhere inside the SVG. Without
    // these the capture is Times New Roman on white whatever the design says.
    for (const property of ['font-family', 'font-size', 'line-height', 'color']) {
      const value = computed.getPropertyValue(property)
      if (value) clone.style.setProperty(property, value)
    }
    for (const [name, value] of customPropertiesAbove(node)) {
      if (!clone.style.getPropertyValue(name)) clone.style.setProperty(name, value)
    }
    clone.style.width = `${viewWidth}px`
    clone.style.margin = '0'

    const resolve = makeResolver()

    for (const image of Array.from(clone.querySelectorAll('img'))) {
      // `srcset` would win over the inlined `src`, and lazy loading never
      // fires inside an SVG image.
      image.removeAttribute('srcset')
      image.removeAttribute('loading')
      const src = image.getAttribute('src')?.trim()
      if (!src || isInline(src)) continue
      const data = await resolve(src)
      if (data) image.setAttribute('src', data)
      else image.removeAttribute('src')
    }

    for (const style of Array.from(clone.querySelectorAll('style'))) {
      style.textContent = await inlineCssUrls(style.textContent ?? '', resolve)
    }
    for (const element of Array.from(clone.querySelectorAll<HTMLElement>('[style*="url("]'))) {
      element.setAttribute('style', await inlineCssUrls(element.getAttribute('style') ?? '', resolve))
    }

    const fontCss = await inlineFontStylesheet(resolve)
    if (fontCss) {
      const style = document.createElement('style')
      style.textContent = fontCss
      clone.prepend(style)
    }

    // XML rather than HTML serialisation: the SVG is parsed as XML, where an
    // unclosed <br> or <img> is a fatal error and the image simply never loads.
    const markup = new XMLSerializer().serializeToString(clone)
    const svg = buildSvg({ markup, viewWidth, viewHeight, ...size })
    const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
    if (!image) return null

    const ground = computed.backgroundColor
    ctx.fillStyle = isOpaque(ground) ? ground : '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    return await new Promise<Blob | null>((done) => {
      try {
        canvas.toBlob((blob) => done(blob), 'image/png')
      } catch {
        done(null)
      }
    })
  } catch {
    return null
  }
}
