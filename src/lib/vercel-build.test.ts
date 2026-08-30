import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every preview deployment this project ever made failed in under ten seconds.
 * `vercel.json` ran `npx convex deploy` for every build, and Convex refuses a
 * production deploy key under `VERCEL_ENV=preview`, by design: a branch build
 * with that key would push unmerged functions into the live backend. Production
 * built green on every merge, so the red mark on every PR was read as the
 * branch's fault for weeks. `scripts/vercel-build.mjs` deploys Convex only for
 * a production build; this pins that, and that vercel.json still goes through it.
 *
 * The script is run rather than imported: `next build` type-checks test files,
 * and a `.mjs` import into a `.ts` file is a build failure waiting to happen.
 */
const SCRIPT = join(process.cwd(), 'scripts/vercel-build.mjs')

function commandFor(vercelEnv: string | undefined): string {
  const env = { ...process.env }
  delete env.VERCEL_ENV
  if (vercelEnv !== undefined) env.VERCEL_ENV = vercelEnv
  return execFileSync(process.execPath, [SCRIPT, '--print'], { env, encoding: 'utf8' }).trim()
}

describe('the build Vercel runs', () => {
  it('deploys Convex around a production build, exactly as before', () => {
    expect(commandFor('production')).toBe("npx convex deploy --cmd 'npm run build'")
  })

  it('never deploys Convex for a branch build: a prod key there is refused, and a preview key buys a backend nobody needs', () => {
    for (const vercelEnv of ['preview', 'development', '', 'Production', undefined]) {
      const command = commandFor(vercelEnv)
      expect(command, `VERCEL_ENV=${String(vercelEnv)}`).toBe('npm run build')
      expect(command).not.toContain('convex')
    }
  })

  it('is what vercel.json calls, so the deploy cannot quietly become unconditional again', () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'))
    expect(config.buildCommand).toBe('node scripts/vercel-build.mjs')
  })
})
