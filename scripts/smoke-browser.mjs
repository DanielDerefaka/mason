/**
 * The check that would have caught /try.
 *
 * `smoke.mjs` fetches each page and calls a 200 with real markup a pass. That
 * is blind to anything that only happens once the bundle runs: /try renders a
 * Suspense fallback on the server, answers 200 with it, and then threw during
 * hydration for a week — the page was an error boundary in every real browser
 * and every check we had was green.
 *
 * So this one drives a real Chrome. It opens each page, waits for it to
 * settle, and fails on three things: an uncaught exception, a console error,
 * or the app's own error boundary appearing in the DOM. Same-origin only —
 * an analytics script that a firewall blocks is not this app's fault.
 *
 * It also looks at /try the way half of paid and social traffic does, from a
 * phone: an emulated 390x844 touch screen, which must get the screen a phone
 * is meant to get and must not ask for a guest session. That pass runs
 * first, on a profile with no cookie yet, so any sign-in it makes is a mint
 * and not a refresh of one the desktop pass left behind.
 *
 * No dependencies. It talks to Chrome's DevTools protocol over the WebSocket
 * that Node has had built in since 22, and uses whatever Chrome is already
 * installed. If there is none, it says so and exits 0: this is an extra pair
 * of eyes, not a gate that stops a machine without a browser from shipping.
 *
 *   npm run dev            # in one terminal
 *   npm run smoke:browser  # in another
 *
 * SMOKE_BASE and CHROME_PATH both override.
 */
import { spawn } from 'node:child_process'
import { accessSync, constants, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000'
const PORT = Number(process.env.CDP_PORT ?? 9422)

/**
 * The pages whose behaviour lives in the browser. Marketing pages are mostly
 * server-rendered and already covered; these are the ones with a client shell
 * that can throw after the server has said 200. The share link's token exists
 * nowhere: the screen it ends on, and the way into /try from it, are drawn
 * entirely in the browser, so the server's 200 says nothing about either.
 */
const PAGES = ['/try', '/explore', '/', '/auth/sign-in', '/s/not-a-live-token']

/**
 * Text a page must have drawn by the time it is judged — the half of a screen
 * that only exists once the bundle has run and its query has answered.
 */
const EXPECTS = { '/s/not-a-live-token': 'Try SketchMason free' }

/**
 * /try from a phone. The shell settles the device before it mounts the guest
 * gate, so a phone is told where Mason draws best and no session is minted
 * for it: `/api/try/admit` is the admission ticket and `/api/auth` the
 * sign-in that spends it, and a phone must reach neither. Every desktop visit
 * to /try in this script spends one of the network's daily sessions; this
 * one is meant to spend nothing, and the request list is how that is known
 * rather than believed.
 */
const PHONE = {
  path: '/try',
  label: '/try on a 390x844 touch screen',
  phone: true,
  expect: 'Mason draws best on a desktop',
  forbid: ['/api/try/admit', '/api/auth'],
}

/** The phone first: its profile must hold no cookie, or nothing is proved. */
const PASSES = [
  PHONE,
  ...PAGES.map((path) => ({ path, label: path, phone: false, expect: EXPECTS[path] })),
]

/** How long a page gets to load, hydrate and settle before it is judged. */
const SETTLE_MS = Number(process.env.SMOKE_SETTLE_MS ?? 9000)

/** The first line of `src/app/error.tsx`. Its presence is the failure. */
const ERROR_BOUNDARY = 'Something broke on this screen'

const CHROMES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

const findChrome = () => {
  for (const path of CHROMES) {
    try {
      accessSync(path, constants.X_OK)
      return path
    } catch {
      // Next candidate.
    }
  }
  return null
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const chrome = findChrome()
if (!chrome) {
  console.log('No Chrome found — skipping the browser smoke. Set CHROME_PATH to run it.')
  process.exit(0)
}

const profile = mkdtempSync(join(tmpdir(), 'mason-smoke-'))
const browser = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const cleanup = () => {
  browser.kill()
  try {
    rmSync(profile, { recursive: true, force: true })
  } catch {
    // Chrome is still flushing its profile as we exit. The OS clears tmp;
    // a leftover directory is not worth turning a passing run into a
    // crash, which is exactly what it did the first time this ran.
  }
}
process.on('exit', cleanup)

/** Chrome takes a moment to open the port; poll rather than guess. */
const attach = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = targets.find((target) => target.type === 'page')
      if (page) return page
    } catch {
      // Not up yet.
    }
    await wait(250)
  }
  throw new Error('Chrome never opened its debugging port')
}

const page = await attach()
const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve)
  socket.addEventListener('error', reject)
})

let messageId = 0
const pending = new Map()
let problems = []
/** The status the main document came back with, or null if it never did. */
let documentStatus = null
/** Every URL the page asked for, so a pass can name what it must not have. */
let requests = []

const send = (method, params = {}) =>
  new Promise((resolve) => {
    messageId += 1
    pending.set(messageId, resolve)
    socket.send(JSON.stringify({ id: messageId, method, params }))
  })

const describe = (arg) => {
  if (!arg) return ''
  if (typeof arg.value === 'string') return arg.value
  if ('value' in arg) return JSON.stringify(arg.value)
  return arg.description ?? arg.className ?? arg.type
}

const sameOrigin = (url) => typeof url === 'string' && url.startsWith(BASE)

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result)
    pending.delete(message.id)
    return
  }
  if (message.method === 'Runtime.exceptionThrown') {
    const details = message.params.exceptionDetails
    problems.push(`uncaught ${details.exception?.description ?? details.text}`)
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    problems.push(`console.error ${message.params.args.map(describe).join(' ')}`)
  }
  if (message.method === 'Network.responseReceived') {
    const { url, status } = message.params.response
    if (message.params.type === 'Document') documentStatus = status
    if (status >= 400 && sameOrigin(url)) problems.push(`${status} ${url}`)
  }
  if (message.method === 'Network.requestWillBeSent') {
    requests.push(message.params.request.url)
  }
})

await send('Runtime.enable')
await send('Page.enable')
await send('Network.enable')

/**
 * A phone, or the desktop every other pass assumes. The metrics make it
 * narrow; touch emulation is what makes `(pointer: coarse)` match, which is
 * the other half of what the shell asks.
 */
const emulate = async (phone) => {
  if (!phone) {
    await send('Emulation.clearDeviceMetricsOverride')
    await send('Emulation.setTouchEmulationEnabled', { enabled: false })
    return
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
}

let failures = 0
console.log(`Browser smoke against ${BASE}\n`)

for (const pass of PASSES) {
  problems = []
  requests = []
  documentStatus = null
  await emulate(pass.phone)
  const navigation = await send('Page.navigate', { url: `${BASE}${pass.path}` })
  // Chrome answers a connection it cannot make with its own error page,
  // which has text in it and no error boundary — so without this the whole
  // run passed against a server that was not running at all.
  if (navigation?.errorText) problems.push(`navigation failed: ${navigation.errorText}`)
  await wait(SETTLE_MS)
  if (documentStatus === null) problems.push('the page never answered')

  const body = await send('Runtime.evaluate', {
    expression: 'document.body.innerText',
    returnByValue: true,
  })
  const text = body?.result?.value ?? ''

  if (text.includes(ERROR_BOUNDARY)) problems.push('the error boundary rendered')
  if (pass.expect && !text.includes(pass.expect)) problems.push(`never drew "${pass.expect}"`)
  if (text.trim().length === 0) problems.push('the page rendered nothing at all')
  for (const forbidden of pass.forbid ?? []) {
    if (requests.some((url) => url.startsWith(`${BASE}${forbidden}`))) {
      problems.push(`asked for ${forbidden}, so a session was minted for a phone`)
    }
  }
  // Which half of the shell's question the emulation reached. The width alone
  // decides this pass, so a Chrome whose touch emulation stops matching
  // `(pointer: coarse)` is reported, not failed.
  if (pass.phone) {
    const coarse = await send('Runtime.evaluate', {
      expression: "matchMedia('(pointer: coarse)').matches",
      returnByValue: true,
    })
    pass.label += coarse?.result?.value
      ? ' (pointer: coarse)'
      : ' (pointer: fine, width alone decided)'
  }

  if (problems.length === 0) {
    console.log(`  ok   ${pass.label}`)
  } else {
    failures += 1
    console.log(`  FAIL ${pass.label}`)
    // Only the first few: one React error arrives three times over.
    for (const problem of problems.slice(0, 3)) {
      console.log(`       ${problem.split('\n')[0].slice(0, 160)}`)
    }
  }
}

console.log(`\n${PASSES.length - failures}/${PASSES.length} passed`)
process.exit(failures === 0 ? 0 : 1)
