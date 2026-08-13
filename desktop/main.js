/**
 * Mason for desktop.
 *
 * The application ships inside the binary: `app/` holds the standalone Next
 * server — the same code as the site — and Electron boots it on a loopback
 * port and opens a window onto it. Data goes straight from here to Convex,
 * and sign-in happens locally against the same deployment as the web.
 *
 * The one thing that does not run locally is anything holding a key. The
 * generate, image and billing routes are rewritten (in next.config, at build
 * time) to proxy to the deployment, with the user's Convex token riding the
 * forwarded cookie — it is signed by Convex, not by the host that set it, so
 * production verifies it exactly as if the request came from the site, and
 * credits and rate limits stay enforced where the keys live.
 *
 * There is no landing page here. A desktop app opens into the product, so the
 * window starts at /dashboard and the middleware bounces a signed-out user to
 * sign-in — the marketing site is in the bundle but nothing navigates to it.
 */

import { app, BrowserWindow, Menu, dialog, net, shell, utilityProcess } from 'electron'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { get } from 'node:http'
import {
  appendFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'

/**
 * The name and the mark.
 *
 * Packaged, both come from electron-builder (productName, build/icon.png).
 * In dev the binary is Electron's own, so the dock would show its atom and
 * its name — the name is set here, and the dock icon swapped at runtime,
 * which macOS allows and dev is the only place it is needed.
 */
app.setName('Mason')
app.whenReady().then(() => {
  const icon = join(import.meta.dirname, 'build', 'icon.png')
  if (!app.isPackaged && process.platform === 'darwin' && existsSync(icon)) {
    app.dock?.setIcon(icon)
  }
})

/**
 * Overridable so `npm run dev` can point the shell at a running dev server
 * instead of booting the bundled one.
 */
const DEV_URL = process.env.MASON_URL ?? null

/** Loopback only — the bundled server must not be reachable off the machine. */
const HOST = '127.0.0.1'

/**
 * Asked of the OS rather than fixed. A hardcoded port means the app loses a
 * race with whatever else fancied 34115 on somebody's machine — and the way
 * that loss presented was a dock icon with no window behind it.
 */
const freePort = () =>
  new Promise((resolve, reject) => {
    if (process.env.MASON_PORT) {
      resolve(Number(process.env.MASON_PORT))
      return
    }
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, HOST, () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })

/** Boot, assert the page loaded, quit. What CI can check without a person. */
const SMOKE = Boolean(process.env.ELECTRON_SMOKE)

/* ------------------------------------------------------------------ *
 * The bundled server
 * ------------------------------------------------------------------ */

let server = null

/**
 * What the server said, kept for the moment it dies.
 *
 * A startup failure used to exit without a word: dock icon, no window, gone —
 * which reads as "the app is broken" and is undebuggable from a screenshot.
 * Now the tail of the server's output goes in a dialog and the whole of it
 * into a log file the person can send.
 */
const serverLog = []
const logFile = () => join(app.getPath('userData'), 'server.log')

const record = (line) => {
  const text = String(line)
  serverLog.push(text)
  if (serverLog.length > 200) serverLog.shift()
  try {
    mkdirSync(app.getPath('userData'), { recursive: true })
    appendFileSync(logFile(), text)
  } catch {
    // The log is a diagnostic, not a dependency.
  }
}

const die = (title, detail) => {
  dialog.showErrorBox(
    title,
    `${detail}

The server's log is at:
${logFile()}

` +
      `Last output:
${serverLog.slice(-12).join('')}`,
  )
  app.exit(1)
}

/**
 * Packaged, the server lives beside the asar rather than inside it: Next
 * reads its build output with plain `fs`, and a utility process does not get
 * Electron's asar-aware fs patching.
 */
// `webapp`, not `app`: a folder named app/ flips electron-builder into its
// legacy two-package.json layout and it tries to package the web server as
// the Electron application itself.
const bundledDir = () =>
  app.isPackaged
    ? join(process.resourcesPath, 'app-server')
    : join(import.meta.dirname, 'webapp')

/* ------------------------------------------------------------------ *
 * Over-the-air payloads
 *
 * The webapp changes with the site; the shell does not. So the shell boots
 * the newest payload from its own data directory, falling back to the one
 * baked into the binary, and a launch-time check fetches a manifest naming
 * the current payload — new one available, download, verify, install, offer
 * a restart. No reinstall, and while the binary is unsigned, crucially no
 * Gatekeeper: the executable never changes, only data in userData.
 * ------------------------------------------------------------------ */

const MANIFEST_URL =
  process.env.MASON_MANIFEST_URL ??
  'https://github.com/DanielDerefaka/mason-releases/releases/download/webapp-latest/manifest.json'

const payloadRoot = () => join(app.getPath('userData'), 'webapp')
/** Written last during install, so a half-written payload is never current. */
const currentFile = () => join(payloadRoot(), 'current')

const payloadVersion = (dir) => {
  try {
    return JSON.parse(readFileSync(join(dir, 'payload.json'), 'utf8')).version ?? null
  } catch {
    return null
  }
}

/** The directory to boot: the installed payload if valid, else the bundled one. */
const serverDir = () => {
  try {
    const version = readFileSync(currentFile(), 'utf8').trim()
    const dir = join(payloadRoot(), version)
    if (existsSync(join(dir, 'server.js')) && existsSync(join(dir, 'payload.json'))) {
      return dir
    }
  } catch {
    // No installed payload — the bundled one is the normal case.
  }
  return bundledDir()
}

/** Electron's net follows redirects, which GitHub release assets require. */
const fetchTo = (url, destination) =>
  new Promise((resolve, reject) => {
    const request = net.request(url)
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`${url} answered ${response.statusCode}`))
        return
      }
      const file = createWriteStream(destination)
      response.on('data', (chunk) => file.write(chunk))
      response.on('end', () => file.end(resolve))
      response.on('error', reject)
    })
    request.on('error', reject)
    request.end()
  })

const fetchJson = (url) =>
  new Promise((resolve, reject) => {
    const request = net.request(url)
    request.on('response', (response) => {
      let body = ''
      response.on('data', (chunk) => (body += chunk))
      response.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          reject(new Error(`${url} was not JSON`))
        }
      })
      response.on('error', reject)
    })
    request.on('error', reject)
    request.end()
  })

const checkForPayloadUpdate = async (win) => {
  const running = payloadVersion(serverDir())
  let manifest
  try {
    manifest = await fetchJson(MANIFEST_URL)
  } catch (error) {
    record(`[ota] manifest unreachable: ${error.message}\n`)
    return
  }
  if (!manifest?.version || !manifest.url || manifest.version === running) return

  const target = join(payloadRoot(), manifest.version)
  if (!existsSync(join(target, 'server.js'))) {
    record(`[ota] downloading payload ${manifest.version}\n`)
    const tarball = join(app.getPath('temp'), `mason-payload-${manifest.version}.tar.gz`)
    try {
      await fetchTo(manifest.url, tarball)

      // Verified before extraction: the payload is executed code, and a
      // manifest fetched over the network must not be the only authority on
      // what arrives. The hash pins the bytes the publisher actually built.
      const digest = createHash('sha256').update(readFileSync(tarball)).digest('hex')
      if (manifest.sha256 && digest !== manifest.sha256) {
        record(`[ota] checksum mismatch for ${manifest.version} — discarded\n`)
        rmSync(tarball, { force: true })
        return
      }

      const staging = `${target}.partial`
      rmSync(staging, { recursive: true, force: true })
      mkdirSync(staging, { recursive: true })
      const untar = spawnSync('/usr/bin/tar', ['-xzf', tarball, '-C', staging])
      rmSync(tarball, { force: true })
      if (untar.status !== 0) {
        record(`[ota] extraction failed for ${manifest.version}\n`)
        rmSync(staging, { recursive: true, force: true })
        return
      }
      renameSync(staging, target)
    } catch (error) {
      record(`[ota] update failed: ${error.message}\n`)
      return
    }
  }

  writeFileSync(currentFile(), manifest.version)
  record(`[ota] payload ${manifest.version} installed\n`)

  // Keep the new payload and the one still running; everything older goes.
  for (const entry of readdirSync(payloadRoot(), { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== manifest.version && entry.name !== running) {
      rmSync(join(payloadRoot(), entry.name), { recursive: true, force: true })
    }
  }

  if (process.env.MASON_OTA_TEST) {
    console.log(`[ota] installed ${manifest.version}`)
    app.exit(0)
    return
  }

  const { response } = await dialog.showMessageBox(win, {
    type: 'info',
    message: 'Mason has updated itself',
    detail:
      'The new version is ready. Restart to switch to it — your work is saved in your account either way.',
    buttons: ['Restart now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  })
  if (response === 0) {
    app.relaunch()
    app.exit(0)
  }
}

const startServer = (port) => {
  // Forked rather than required: Next owns its process — its own signal
  // handling, its own exit — and Electron's main process is not the place
  // for either. utilityProcess is Electron's supported way to run plain Node.
  server = utilityProcess.fork(join(serverDir(), 'server.js'), [], {
    cwd: serverDir(),
    // The person's own environment, with ours on top. A child built from
    // scratch has no PATH and no HOME, which is the kind of thing that works
    // on the machine that built it and nowhere else.
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOSTNAME: HOST,
      PORT: String(port),
    },
    stdio: 'pipe',
    serviceName: 'mason-server',
  })
  server.stdout?.on('data', (line) => {
    record(line)
    process.stdout.write(`[server] ${line}`)
  })
  server.stderr?.on('data', (line) => {
    record(line)
    process.stderr.write(`[server] ${line}`)
  })
  // A server that dies before the window exists is a startup failure, and
  // waiting out the poll before saying so is twenty silent seconds.
  server.once('exit', (code) => {
    if (BrowserWindow.getAllWindows().length === 0 && !SMOKE) {
      die('Mason could not start', `Its internal server exited with code ${code}.`)
    }
  })
}

/** Polls until the server answers, so the window never shows a dead page. */
const waitForServer = (url, timeoutMs = 20_000) =>
  new Promise((resolve, reject) => {
    const started = Date.now()
    const probe = () => {
      get(url, (response) => {
        response.resume()
        resolve()
      }).on('error', () => {
        if (Date.now() - started > timeoutMs) reject(new Error('server never answered'))
        else setTimeout(probe, 150)
      })
    }
    probe()
  })

/* ------------------------------------------------------------------ *
 * Window state
 * ------------------------------------------------------------------ */

const stateFile = () => join(app.getPath('userData'), 'window-state.json')

const readState = () => {
  try {
    return JSON.parse(readFileSync(stateFile(), 'utf8'))
  } catch {
    return { width: 1440, height: 900 }
  }
}

const saveState = (win) => {
  try {
    if (win.isDestroyed() || win.isFullScreen()) return
    mkdirSync(app.getPath('userData'), { recursive: true })
    writeFileSync(stateFile(), JSON.stringify(win.getBounds()))
  } catch {
    // Losing a window size is not worth interrupting anything over.
  }
}

/* ------------------------------------------------------------------ *
 * Menu
 *
 * Custom for one load-bearing reason: Electron's default menu binds the
 * viewport-zoom roles to ⌘+/⌘−/⌘0 and Undo to ⌘Z, and a menu accelerator is
 * handled before the page ever sees the keystroke. The editor binds all four
 * itself — canvas zoom and its own history — so the default menu would break
 * the app's core shortcuts silently. Undo/Redo stay in the menu for text
 * fields, but without accelerators, so the keys reach the page.
 * ------------------------------------------------------------------ */

const buildMenu = (win) =>
  Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: 'Mason', role: 'appMenu' }] : []),
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', click: () => win.webContents.undo() },
        { label: 'Redo', click: () => win.webContents.redo() },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ])

/* ------------------------------------------------------------------ */

const createWindow = (origin) => {
  const state = readState()

  const win = new BrowserWindow({
    ...state,
    title: 'Mason',
    minWidth: 960,
    minHeight: 600,
    show: !SMOKE,
    backgroundColor: '#0B0B0C',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  /**
   * Mason stays in the app; everything else opens in the default browser.
   * Share links, checkout, "view on the web" — all web things, and the
   * person's real browser is where their sessions and payment methods are.
   *
   * `localhost` and `127.0.0.1` are the same machine and must count as the
   * same origin here: the middleware's redirects rebuild absolute URLs and
   * can swap one spelling for the other, which otherwise reads as "external"
   * and throws every in-app navigation out to the browser.
   */
  const allowed = new Set([origin, origin.replace('127.0.0.1', 'localhost')])
  const external = (url) => !allowed.has(new URL(url).origin)

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!external(url)) return { action: 'allow' }
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (!external(url)) return
    event.preventDefault()
    void shell.openExternal(url)
  })

  let saveTimer = null
  const queueSave = () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveState(win), 500)
  }
  win.on('resize', queueSave)
  win.on('move', queueSave)
  win.on('close', () => saveState(win))

  Menu.setApplicationMenu(buildMenu(win))

  if (SMOKE) {
    const fail = (reason) => {
      console.error(`[smoke] ${reason}`)
      app.exit(1)
    }
    win.webContents.on('did-finish-load', () => {
      console.log(`[smoke] loaded ${win.webContents.getURL()}`)
      app.exit(0)
    })
    win.webContents.on('did-fail-load', (_event, code, description) =>
      fail(`did-fail-load ${code} ${description}`),
    )
    setTimeout(() => fail('timed out after 30s'), 30_000)
  }

  // Straight into the product. Signed out, the middleware answers with the
  // sign-in page; there is no route to the marketing site from here.
  void win.loadURL(`${origin}/dashboard`)

  // After the window is up, quietly. An update check must never sit between
  // the person and their canvas.
  if (!SMOKE && !DEV_URL) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => void checkForPayloadUpdate(win), 3000)
    })
  }
  return win
}

const boot = async () => {
  let origin
  if (DEV_URL) {
    origin = new URL(DEV_URL).origin
  } else {
    let port
    try {
      port = await freePort()
    } catch (error) {
      die('Mason could not start', `No local port was available: ${error.message}.`)
      return
    }
    console.log(`[mason] payload ${payloadVersion(serverDir()) ?? 'unstamped'} from ${serverDir()}`)
    startServer(port)
    origin = `http://${HOST}:${port}`
    try {
      await waitForServer(origin)
    } catch {
      if (SMOKE) {
        console.error('[smoke] server never answered')
        app.exit(1)
        return
      }
      die('Mason could not start', 'Its internal server never answered.')
      return
    }
  }
  createWindow(origin)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(origin)
  })
}

app.whenReady().then(boot)

app.on('window-all-closed', () => {
  // macOS apps live in the dock until quit; everywhere else, closing is quitting.
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  server?.kill()
})
