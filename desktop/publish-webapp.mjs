/**
 * Publishes the current webapp payload for over-the-air update.
 *
 * The desktop shell checks a rolling release — `webapp-latest` on the public
 * releases repository — for a manifest naming the newest payload. Publishing
 * is therefore: tar the payload, hash it, write the manifest, replace both
 * assets. Installed apps pick it up on their next launch with no reinstall,
 * which matters twice over while the shell is unsigned: Gatekeeper never
 * sees a payload swap.
 *
 * Run after `npm run bundle`. The shell itself (main.js, Electron) still
 * ships by dmg — that tier waits on code-signing.
 */

import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const here = import.meta.dirname
const webapp = join(here, 'webapp')
const out = join(here, 'release')

if (!existsSync(join(webapp, 'payload.json'))) {
  console.error('No stamped payload — run `npm run bundle` first.')
  process.exit(1)
}
const { version } = JSON.parse(readFileSync(join(webapp, 'payload.json'), 'utf8'))

mkdirSync(out, { recursive: true })
const tarball = join(out, 'webapp.tar.gz')
console.log(`packing payload ${version}…`)
execSync(`tar -czf "${tarball}" -C "${webapp}" .`, { stdio: 'inherit' })

const sha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex')
const manifest = {
  version,
  sha256,
  url: 'https://github.com/DanielDerefaka/mason-releases/releases/download/webapp-latest/webapp.tar.gz',
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

const repo = 'DanielDerefaka/mason-releases'
// A rolling release: same tag forever, assets replaced. `--latest=false` so
// it never outranks the installer releases on the repo's front page.
try {
  execSync(`gh release view webapp-latest --repo ${repo}`, { stdio: 'ignore' })
} catch {
  execSync(
    `gh release create webapp-latest --repo ${repo} --latest=false ` +
      `--title "Webapp payload (rolling)" ` +
      `--notes "The desktop app's over-the-air payload. Replaced on every publish; installed apps update themselves on next launch."`,
    { stdio: 'inherit' },
  )
}
execSync(
  `gh release upload webapp-latest --repo ${repo} --clobber "${tarball}" "${join(out, 'manifest.json')}"`,
  { stdio: 'inherit' },
)
console.log(`published payload ${version} (sha256 ${sha256.slice(0, 12)}…)`)
