/**
 * The checks every survey of this app has been running by hand.
 *
 * Three things, against a server that is already running:
 *
 *   1. Every public page renders — status 200, real markup, no Next error
 *      overlay. Server-side only: /try answered 200 here for a week while
 *      being an error boundary in every real browser, because the page the
 *      server renders is a Suspense fallback and the crash was in the
 *      hydrated shell. `npm run smoke:browser` is the check for that.
 *   2. Every protected page refuses an anonymous visitor. A page that answers
 *      200 without a session is a leak, and it is not visible from the code —
 *      it depends on the middleware matcher, which has been wrong before.
 *   3. Every generation route refuses an unauthenticated POST with 401. Not
 *      500, not 200. These routes cost money per call, so "does the guard fire
 *      before the model does" is the single most valuable thing to assert, and
 *      it costs nothing to assert because no model is ever reached.
 *   4. Every file the site serves at a dotted path — /llms.txt — answers with
 *      text rather than markup. A route handler that starts returning the app
 *      shell still answers 200, so the body is what has to be checked.
 *   5. The share cards render as images, and a post is its own page to a
 *      crawler — a description of its own and Article markup. An ImageResponse
 *      that throws is a 500 nothing else fetches, and four posts sharing one
 *      description is invisible from any single page.
 *   6. The sitemap lists every public page and served file, and the icons
 *      carry the mark at the sizes that get picked. Both are hand-written
 *      files a crawler reads before anything else, and both shipped wrong
 *      with every other check green.
 *
 * The first and fourth lists are derived from `src/app` rather than written
 * down, because a list is the thing that gets forgotten: /faq and /llms.txt
 * both reached production with no check on them at all.
 *
 * Deliberately no browser and no dependencies, so it is free to run as often
 * as you like. Vitest covers the pure layer, this covers wiring, and
 * `scripts/smoke-browser.mjs` covers what only happens once the bundle runs.
 *
 *   npm run dev          # in one terminal
 *   npm run smoke        # in another
 */

import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:3000'

/**
 * The marketing pages, read from the route group rather than listed here.
 *
 * A new public page needs three lists, not two: the middleware matcher, the
 * bypass list in src/lib/permissions.ts, and this. /faq was added to the first
 * two — permissions.test.ts even derives its half from this same directory so
 * the pair cannot drift — and shipped to production uncovered by any smoke
 * check, because this one was still a list someone had to remember. Deriving
 * it is the only version of this that stays true.
 *
 * Read from the local checkout even when SMOKE_BASE points at a deployment,
 * which is deliberate: what is being asserted is that everything this revision
 * thinks it serves is actually being served over there. A page that exists
 * here and 404s there is exactly the failure worth hearing about.
 */
const routeSegments = (dir, keep) => {
  const path = join(process.cwd(), dir)
  return readdirSync(path)
    .filter((entry) => statSync(join(path, entry)).isDirectory() && keep(entry))
    .sort()
}

// Dynamic segments have no literal form to fetch; `[slug]` under /blog is
// covered by /blog itself rendering its index.
const MARKETING_PAGES = routeSegments(
  'src/app/(marketing)',
  (entry) => !entry.startsWith('[') && !entry.startsWith('('),
).map((segment) => `/${segment}`)

/**
 * Files the site serves at a dotted path — today just /llms.txt, whose route
 * handler lives in `src/app/llms.txt/`. Derived by the same rule
 * `src/lib/routes.test.ts` uses to keep them *out* of the middleware matcher,
 * so the two halves of that decision are read from one fact.
 */
const SERVED_FILES = routeSegments('src/app', (entry) => entry.includes('.')).map(
  (segment) => `/${segment}`,
)

const PUBLIC_PAGES = [
  '/',
  ...MARKETING_PAGES,
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  // The free canvas: a bypass route, so it must answer 200 to a visitor with
  // no cookie at all. /explore is the same and comes from the group above.
  '/try',
  // A share link, with a token that exists nowhere. Same rule — no cookie,
  // 200 — and the screen it ends on is drawn in the browser, so all this can
  // see is that the route answers; smoke:browser watches the rest.
  '/s/not-a-live-token',
]

/** Anonymous visitors belong at sign-in, not inside. */
const PROTECTED_PAGES = ['/dashboard', '/billing', '/settings']

/**
 * Every route that can reach a model. Kept as one list on purpose: adding a
 * generation route and forgetting to add it here is the mistake this catches,
 * and src/app/api/routes.test.ts fails if a generation route is
 * missing from it.
 */
const GENERATION_ROUTES = [
  '/api/generate',
  '/api/generate/style',
  '/api/generate/mobile',
  '/api/generate/node',
  '/api/generate/revise',
  '/api/generate/continue',
  '/api/generate/workflow',
  '/api/generate/workflow/plan',
]

const results = []
const record = (name, ok, detail) => {
  results.push({ name, ok, detail })
  process.stdout.write(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}\n`)
}

const get = (path, redirect = 'manual') =>
  fetch(`${BASE}${path}`, { redirect, headers: { 'user-agent': 'mason-smoke' } })

const main = async () => {
  try {
    await get('/')
  } catch {
    console.error(`No server at ${BASE}. Start it with \`npm run dev\` first.`)
    process.exit(2)
  }

  console.log(`\nPublic pages (${BASE})`)
  for (const path of PUBLIC_PAGES) {
    const response = await get(path, 'follow')
    const body = await response.text()

    if (response.status !== 200) {
      record(path, false, `status ${response.status}`)
      continue
    }
    // Next renders its error overlay as a real 200 page, so status alone is
    // not evidence the page works.
    if (body.includes('__next_error__') || /Unhandled Runtime Error/i.test(body)) {
      record(path, false, 'rendered the Next error overlay')
      continue
    }
    if (!/<body/i.test(body) || body.length < 500) {
      record(path, false, `suspiciously short body (${body.length} bytes)`)
      continue
    }
    record(path, true)
  }

  console.log('\nProtected pages refuse an anonymous visitor')
  for (const path of PROTECTED_PAGES) {
    const response = await get(path)
    const location = response.headers.get('location') ?? ''
    const redirected = response.status >= 300 && response.status < 400
    const toSignIn = location.includes('/auth/sign-in')

    record(
      path,
      redirected && toSignIn,
      redirected ? (toSignIn ? '' : `redirected to ${location}`) : `status ${response.status}`,
    )
  }

  console.log('\nGeneration routes refuse an unauthenticated POST')
  for (const path of GENERATION_ROUTES) {
    const response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
      // Without this the middleware's redirect is followed to the sign-in
      // page and the refusal is reported as a 200.
      redirect: 'manual',
    })

    // Two shapes count as refused, and both are correct. The middleware sends
    // an anonymous caller to sign-in before the route runs at all; the route's
    // own 401 is what a caller with an expired session gets. A 200 means
    // neither fired, and a 500 means one of them threw instead of refusing.
    const location = response.headers.get('location') ?? ''
    const refused =
      response.status === 401 ||
      (response.status >= 300 && response.status < 400 && location.includes('/auth/sign-in'))

    record(path, refused, refused ? '' : `status ${response.status}`)
  }

  console.log('\nAdmission endpoint answers a stranger')
  // Always 200 with an `admission` key: a token when the secret is set, null
  // when it is not. Either is right; a 500 or a redirect to sign-in is not —
  // the whole point of the route is that nobody has a session yet.
  try {
    const admit = await fetch(`${BASE}/api/try/admit`, { method: 'POST', redirect: 'manual' })
    const body = admit.status === 200 ? await admit.json().catch(() => null) : null
    const shaped = body !== null && typeof body === 'object' && 'admission' in body
    record(
      '/api/try/admit',
      admit.status === 200 && shaped,
      admit.status !== 200 ? `status ${admit.status}` : shaped ? '' : 'no admission key in the body',
    )
  } catch (error) {
    record('/api/try/admit', false, error instanceof Error ? error.message : String(error))
  }

  console.log('\nWebhook rejects an unsigned payload')
  const webhook = await fetch(`${BASE}/api/polar/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'subscription.active' }),
  })
  record(
    '/api/polar/webhook',
    webhook.status >= 400,
    webhook.status >= 400 ? '' : `accepted an unsigned payload (${webhook.status})`,
  )

  console.log('\nServed files answer as files, not as the app shell')
  for (const path of SERVED_FILES) {
    const response = await get(path, 'follow')
    const body = await response.text()
    const type = response.headers.get('content-type') ?? ''

    if (response.status !== 200) {
      record(path, false, `status ${response.status}`)
      continue
    }
    // The failure worth catching: the handler stops matching and Next serves
    // the HTML shell instead, which is still a cheerful 200.
    if (type.includes('text/html') || /<!doctype html|<body/i.test(body)) {
      record(path, false, 'served markup instead of text')
      continue
    }
    record(path, body.trim().length > 0, body.trim().length > 0 ? '' : 'empty body')
  }

  // The sitemap is the first thing a crawler reads, and it is written by
  // hand: /llms.txt answered 200 for a week while the ten URLs in it left the
  // file out. Pathnames only — the entries name the production host whatever
  // BASE this is running against.
  console.log('\nThe sitemap lists every public page and served file')
  {
    const response = await get('/sitemap.xml', 'follow')
    const xml = response.status === 200 ? await response.text() : ''
    const listed = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname))
    const missing = ['/', ...MARKETING_PAGES, '/try', ...SERVED_FILES].filter((path) => !listed.has(path))
    record(
      '/sitemap.xml lists every public page and served file',
      response.status === 200 && missing.length === 0,
      response.status !== 200 ? `status ${response.status}` : missing.length ? `missing ${missing.join(', ')}` : '',
    )
  }

  // The rename is a set of strings, and strings are what a merge that touches
  // the layout can quietly lose. One fetch checks the title a result shows,
  // the site name a share card shows, and the machine-readable statement that
  // "Mason" and "SketchMason" are one entity — on both structured-data blocks.
  console.log('\nThe home page carries the brand, in words and in structured data')
  {
    const html = await (await get('/', 'follow')).text()
    const titled = html.includes('<title>SketchMason — draw the shape, get the product</title>')
    const named = /property="og:site_name" content="SketchMason"/.test(html)
    const entity = (html.match(/"alternateName":"Mason"/g) ?? []).length === 2
    record(
      '/ is SketchMason to a person, a share card and a machine',
      titled && named && entity,
      [!titled && 'title', !named && 'og:site_name', !entity && 'alternateName on both blocks']
        .filter(Boolean)
        .join(', '),
    )
  }

  console.log('\nShare cards render, and a post is a page to a crawler')
  const card = async (path) => {
    const response = await get(path, 'follow')
    const type = response.headers.get('content-type') ?? ''
    const image = response.status === 200 && type.startsWith('image/')
    record(path, image, image ? '' : response.status === 200 ? `served ${type}` : `status ${response.status}`)
  }
  await card('/opengraph-image')

  // The post is found from the index so no slug is written down here: the
  // check is on whichever post is listed first, and stays true as posts change.
  const index = await (await get('/blog', 'follow')).text()
  const slugs = [...new Set([...index.matchAll(/href="\/blog\/([^"/]+)"/g)].map((m) => m[1]))]
  if (slugs.length < 2) {
    record('/blog lists its posts', false, `found ${slugs.length} post link(s)`)
  } else {
    // Two posts, two descriptions. The regression: every post inherited the
    // site's sentence, so the results showed one description under four titles.
    const crawl = async (slug) => {
      const html = await (await get(`/blog/${slug}`, 'follow')).text()
      return {
        description: html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '',
        article: html.includes('"@type":"BlogPosting"'),
        image: html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? '',
      }
    }
    const [first, second] = await Promise.all(slugs.slice(0, 2).map(crawl))

    // The card is fetched at the URL the page advertises, not one written
    // here: a metadata route under a route group is served with a hash in its
    // name, and the invariant is that whatever the page points at renders.
    // Its path only, against BASE — in development Next advertises the card on
    // localhost whatever the host it was asked on.
    if (first.image) {
      const advertised = new URL(first.image)
      await card(advertised.pathname + advertised.search)
    } else {
      record(`/blog/${slugs[0]} advertises a card`, false, 'no og:image')
    }
    const own = first.description.length > 0 && first.description !== second.description
    record(
      `/blog/${slugs[0]} describes itself`,
      own,
      own ? '' : first.description ? 'same description as the next post' : 'no description',
    )
    record(
      `/blog/${slugs[0]} is a BlogPosting`,
      first.article,
      first.article ? '' : 'no BlogPosting structured data',
    )
  }

  // The icons a crawler picks from. Google takes the .ico over the SVG and
  // wants a layer of at least 48 in it; iOS and iMessage take the apple icon.
  // The regression: the mark went into icon.svg, favicon.ico stayed
  // create-next-app's triangle, and the brand results wore the triangle.
  console.log('\nThe icons carry the mark at the sizes that get picked')
  {
    const response = await get('/favicon.ico', 'follow')
    const bytes = new DataView(await response.arrayBuffer())
    const layers = []
    if (response.status === 200 && bytes.byteLength >= 6 && bytes.getUint16(2, true) === 1) {
      const count = bytes.getUint16(4, true)
      for (let index = 0; index < count && bytes.byteLength >= 6 + 16 * (index + 1); index++) {
        layers.push(bytes.getUint8(6 + 16 * index) || 256)
      }
    }
    // Largest first as well: Next advertises the file at the size of its
    // first entry, and production said sizes="16x16" with a 48 in the file.
    const complete = [16, 32, 48].every((size) => layers.includes(size)) && layers[0] === 48
    record(
      '/favicon.ico carries 48, 32 and 16, largest first',
      complete,
      complete ? '' : response.status === 200 ? `layers: ${layers.join(', ') || 'none'}` : `status ${response.status}`,
    )
  }
  {
    const response = await get('/apple-icon.png', 'follow')
    const bytes = new DataView(await response.arrayBuffer())
    // A PNG's first chunk is IHDR, so width and height sit at fixed offsets.
    const png = response.status === 200 && bytes.byteLength >= 24 && bytes.getUint32(0) === 0x89504e47
    const size = png ? `${bytes.getUint32(16)}×${bytes.getUint32(20)}` : ''
    record(
      '/apple-icon.png is 180×180',
      size === '180×180',
      size === '180×180' ? '' : png ? `is ${size}` : `status ${response.status}`,
    )
  }

  const failed = results.filter((result) => !result.ok)
  console.log(
    `\n${results.length - failed.length}/${results.length} passed` +
      (failed.length ? ` — ${failed.length} failed\n` : '\n'),
  )
  process.exit(failed.length ? 1 : 0)
}

void main()
