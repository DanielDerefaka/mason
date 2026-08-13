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

import { app, BrowserWindow, Menu, shell, utilityProcess } from 'electron'
import { get } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const PORT = Number(process.env.MASON_PORT ?? 34_115)

/** Boot, assert the page loaded, quit. What CI can check without a person. */
const SMOKE = Boolean(process.env.ELECTRON_SMOKE)

/* ------------------------------------------------------------------ *
 * The bundled server
 * ------------------------------------------------------------------ */

let server = null

/**
 * Packaged, the server lives beside the asar rather than inside it: Next
 * reads its build output with plain `fs`, and a utility process does not get
 * Electron's asar-aware fs patching.
 */
// `webapp`, not `app`: a folder named app/ flips electron-builder into its
// legacy two-package.json layout and it tries to package the web server as
// the Electron application itself.
const serverDir = () =>
  app.isPackaged
    ? join(process.resourcesPath, 'app-server')
    : join(import.meta.dirname, 'webapp')

const startServer = () => {
  // Forked rather than required: Next owns its process — its own signal
  // handling, its own exit — and Electron's main process is not the place
  // for either. utilityProcess is Electron's supported way to run plain Node.
  server = utilityProcess.fork(join(serverDir(), 'server.js'), [], {
    cwd: serverDir(),
    env: {
      NODE_ENV: 'production',
      HOSTNAME: HOST,
      PORT: String(PORT),
    },
    stdio: 'pipe',
    serviceName: 'mason-server',
  })
  server.stdout?.on('data', (line) => process.stdout.write(`[server] ${line}`))
  server.stderr?.on('data', (line) => process.stderr.write(`[server] ${line}`))
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
  return win
}

const boot = async () => {
  let origin
  if (DEV_URL) {
    origin = new URL(DEV_URL).origin
  } else {
    startServer()
    origin = `http://${HOST}:${PORT}`
    try {
      await waitForServer(origin)
    } catch (error) {
      console.error(`[mason] ${error.message}`)
      app.exit(1)
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
