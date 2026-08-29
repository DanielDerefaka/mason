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
 * that can throw after the server has said 200.
 */
const PAGES = ['/try', '/explore', '/', '/auth/sign-in']

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
})

await send('Runtime.enable')
await send('Page.enable')
await send('Network.enable')

let failures = 0
console.log(`Browser smoke against ${BASE}\n`)

for (const path of PAGES) {
  problems = []
  documentStatus = null
  const navigation = await send('Page.navigate', { url: `${BASE}${path}` })
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
  if (text.trim().length === 0) problems.push('the page rendered nothing at all')

  if (problems.length === 0) {
    console.log(`  ok   ${path}`)
  } else {
    failures += 1
    console.log(`  FAIL ${path}`)
    // Only the first few: one React error arrives three times over.
    for (const problem of problems.slice(0, 3)) {
      console.log(`       ${problem.split('\n')[0].slice(0, 160)}`)
    }
  }
}

console.log(`\n${PAGES.length - failures}/${PAGES.length} passed`)
process.exit(failures === 0 ? 0 : 1)
