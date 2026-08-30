/**
 * The build Vercel runs, chosen by which environment it is building.
 *
 *   node scripts/vercel-build.mjs           # what vercel.json calls
 *   node scripts/vercel-build.mjs --print   # show the command, run nothing
 *
 * Why this exists: `vercel.json` used to run `npx convex deploy --cmd 'npm run
 * build'` for every build, and Convex refuses a production deploy key under
 * `VERCEL_ENV=preview` — deliberately, because a branch build holding that key
 * would push unmerged functions into the live backend the moment a PR opened.
 * So every preview deployment this project ever made died at that check in
 * under ten seconds and every PR wore a red mark, while production built green
 * on every merge, which is why it read as the branch's fault for weeks.
 *
 * A preview deploy key is the other way out, and what it buys is a fresh,
 * empty Convex backend per branch with no environment variables: nothing a
 * review of this site needs. So a branch build deploys nothing. It builds the
 * site against the dev backend named by the Preview-scoped
 * `NEXT_PUBLIC_CONVEX_URL` on Vercel, the value `convex deploy --cmd` would
 * otherwise have injected, and only a production build touches Convex.
 *
 * `VERCEL_ENV` is `production` for a build of the production branch and
 * `preview` for everything else. Anything that is not exactly `production`
 * skips the deploy, so an unexpected value fails towards not touching prod.
 */
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export const DEPLOY_AND_BUILD = "npx convex deploy --cmd 'npm run build'"
export const BUILD_ONLY = 'npm run build'

export function commandFor(vercelEnv) {
  return vercelEnv === 'production' ? DEPLOY_AND_BUILD : BUILD_ONLY
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  const env = process.env.VERCEL_ENV
  const command = commandFor(env)
  if (process.argv.includes('--print')) {
    console.log(command)
    process.exit(0)
  }
  console.log(`vercel-build: VERCEL_ENV=${env ?? '(unset)'}, running: ${command}`)
  const result = spawnSync(command, { stdio: 'inherit', shell: true })
  process.exit(result.status ?? 1)
}
