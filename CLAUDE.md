# Mason

Turns hand-drawn sketches into finished interfaces. Next 15.5 (App Router) ·
Convex · Redux Toolkit · Tailwind v4 · Vercel AI SDK.

Live at `mason-puce.vercel.app`. Convex dev is `cheery-basilisk-43`, production is
`brave-corgi-499` — **separate databases**, so nothing made while developing exists in
production.

## Read the git log first

Commit messages here are long on purpose: they carry the reasoning, not just the change.
`git log --oneline -30` and reading the last few in full is the fastest way to understand
why something is the way it is. Several of them explain bugs that took hours to find and
would otherwise look like arbitrary code.

## Commands

```bash
npm run dev          # then, in another terminal:
npm run smoke        # 18 live checks against a running server
npm test             # 463 unit tests, no server needed
npm run build        # always check the exit code, not the log
npx convex dev --once
```

`SMOKE_BASE=https://your-domain npm run smoke` runs the same checks against a deployment.
It never calls a model, so it is free to run as often as you like.

## Traps this project has actually hit

**`rm -rf .next` is not enough.** `next/font/google` caches resolved font URLs in
`node_modules/.cache`. A stale one 404s and returns 500 on *every* page. Clear both.

**Never run `npm run build` while `npm run dev` is live** — the build rewrites `.next` out
from under the dev server and every route starts 500ing.

**Do not grep the build log for "Failed"** — it matches unrelated font warnings. Check the
exit code.

**A gateway in front of Anthropic silently drops parameters.** `output_config` and
`thinking`/`effort` are both dropped by agentrouter.org, which is why generation used to
return 200 with an empty body: the model spent its whole budget reasoning. If a model call
misbehaves in a way that makes no sense, verify the transport before debugging the prompt.

**Secrets never get echoed.** Env inspections are masked, `.env`/`.env.local` stay
gitignored, and every commit is preceded by a staged-diff secret scan. `convex env list`
prints values — pipe it through `grep -E '^[A-Z_]+=' | cut -d= -f1`.

## Shape of the thing

- `src/app/api/generate/*` — every route that reaches a model. Each one must identify its
  caller, be rate limited, appear in `scripts/smoke.mjs`, and either spend a credit or carry
  a comment explaining why not. `src/app/api/routes.test.ts` enforces this from the
  filesystem, so a new route is opted in by existing.
- `src/prompts/index.ts` — the generation prompts. Large and load-bearing; backticks inside
  the template literals must be escaped.
- `src/lib/sanitise.ts` — stands between model output and `dangerouslySetInnerHTML`. Its
  tests are written as attacks. A design's stylesheet is rewritten so every selector is
  confined beneath `.mason-design`.
- `src/components/editor/` — the full-screen editor. Node ids are **positional paths**
  (`0.2.1`) so regeneration can remap them; anything that reshapes the tree must
  `restamp()`.
- `src/components/canvas/` — the infinite canvas, shapes, frames.
- `convex/` — schema, auth, projects, credits, subscriptions, shares.

## Conventions

Comments explain *why*, not what. Tests are named as the behaviour they protect, and the
comment above a regression test says what shipped broken. British spelling in prose.

Never invent an API key. `.env.example` carries names only.
