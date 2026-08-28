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
 *
 * Deliberately no browser and no dependencies, so it is free to run as often
 * as you like. Vitest covers the pure layer, this covers wiring, and
 * `scripts/smoke-browser.mjs` covers what only happens once the bundle runs.
 *
 *   npm run dev          # in one terminal
 *   npm run smoke        # in another
 */

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:3000'

const PUBLIC_PAGES = [
  '/',
  '/about-us',
  '/blog',
  '/download',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  // The free canvas and the gallery: bypass routes, so they must answer 200
  // to a visitor with no cookie at all.
  '/try',
  '/explore',
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

  const failed = results.filter((result) => !result.ok)
  console.log(
    `\n${results.length - failed.length}/${results.length} passed` +
      (failed.length ? ` — ${failed.length} failed\n` : '\n'),
  )
  process.exit(failed.length ? 1 : 0)
}

void main()
