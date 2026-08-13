/**
 * Builds the web app for the desktop and folds it into `desktop/app/`.
 *
 * One command instead of four, because the four have order and env that must
 * be exactly right: the build needs the production Convex URL (the client
 * bundle bakes it in), the upstream for the keyed routes, and the standalone
 * output flag — and the copy step has to assemble the standalone server, its
 * static assets and the public folder into one runnable directory.
 *
 * Refuses to run while the dev server is up: `next build` rewrites `.next`
 * underneath it and every route starts 500ing, which this repository has been
 * bitten by before.
 */

import { execSync, spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

const UPSTREAM = process.env.DESKTOP_UPSTREAM ?? 'https://mason-puce.vercel.app'
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? 'https://brave-corgi-499.convex.cloud'

const devServerRunning = () => {
  try {
    const out = execSync('pgrep -f "webprodigies-s2c/node_modules/.bin/next dev"', {
      encoding: 'utf8',
    })
    return out.trim().length > 0
  } catch {
    return false
  }
}

if (devServerRunning()) {
  console.error('The dev server is running. Stop it first — building rewrites .next under it.')
  process.exit(1)
}

console.log(`building against ${UPSTREAM} (convex: ${CONVEX_URL})`)
const build = spawnSync('npm', ['run', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    DESKTOP_BUILD: '1',
    DESKTOP_UPSTREAM: UPSTREAM,
    NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
    NEXT_PUBLIC_APP_URL: UPSTREAM,
  },
})
if (build.status !== 0) process.exit(build.status ?? 1)

const app = join(import.meta.dirname, 'webapp')
rmSync(app, { recursive: true, force: true })
mkdirSync(app, { recursive: true })
cpSync(join(root, '.next', 'standalone'), app, { recursive: true })
cpSync(join(root, '.next', 'static'), join(app, '.next', 'static'), { recursive: true })
cpSync(join(root, 'public'), join(app, 'public'), { recursive: true })

console.log('bundled into desktop/webapp — `npm run smoke` to verify, `npm run dist` to package')
