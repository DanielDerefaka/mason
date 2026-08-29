# Mason

Turns hand-drawn sketches into finished interfaces. Next 15.5 (App Router) ·
Convex · Redux Toolkit · Tailwind v4 · Vercel AI SDK.

Live at `sketchmason.com` (the Vercel deployment `mason-puce.vercel.app` behind it). Convex dev is `cheery-basilisk-43`, production is
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
npm run smoke        # 24 live checks against a running server
npm run smoke:browser # 5 pages in a real headless Chrome, for what smoke cannot see
npm test             # 790 unit tests, no server needed
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

**A green `npm run smoke` does not mean the page works.** It fetches, so it only ever sees
what the server rendered. `/try` answered 200 for a week while being an error boundary in
every real browser: the server renders a Suspense fallback and the client shell throws on
hydration. `npm run smoke:browser` drives a real headless Chrome and fails on a console
error, an uncaught exception or the error boundary appearing. Run it before believing a
page is fine.

**`smoke:browser` failing `/try` with `400 /api/auth` is usually the guest cap, not a
bug.** `GUEST_SESSIONS_PER_IP_PER_DAY` is 10 and every run burns one, so the eleventh run
of the day is refused by `guest.admitIp` exactly as designed. `localhost` and `127.0.0.1`
hash to different IPs, so `SMOKE_BASE=http://127.0.0.1:3000 npm run smoke:browser` gets a
fresh allowance. `npx convex data guest_ips` shows the counts.

**A new public page needs two lists, not one.** `src/middleware.ts`'s matcher is an
allow-list of real routes, and `isBypassRoute` in `src/lib/permissions.ts` decides which of
them may be read without a session. Adding a page to the matcher alone makes the middleware
run and then redirect it to `/auth/sign-in` — /faq did exactly that until a build caught it.
`permissions.test.ts` now reads `src/app/(marketing)` from disk and requires every page in it
to be bypassed. It was briefly three lists: `scripts/smoke.mjs` kept its own hand-written
page list, so /faq and /llms.txt shipped to production with no check on them. That script
derives both from `src/app` now — the marketing group for pages, dotted directories for
files — so a new page is covered by existing, and the count above moves on its own.

**`FREE_WEEK` must never gate `/`.** It did: `(marketing)/page.tsx` called `redirect('/try')`
whenever the flag was on, so setting it in production took the whole landing page off the
internet — `/` answered 307 and every campaign link resolved to the canvas instead of the
pitch. The header, footer and hero all offer /try on their own now. The flag still redirects
`/auth/*`, which is the half that is meant to.

**`state.shapes.entities` is the entity adapter's state, not the table of shapes.** The
table is one level further in, at `state.shapes.entities.entities`, so `state.shapes.ids`
is undefined and `state.shapes.entities[id]` is undefined — both silently. The names
collide and three separate files got it wrong: one crashed `/try` on mount, one left the
instruction bar permanently disabled, one broke remix. Go through
`shapesAdapter.getSelectors()` and hand it `state.shapes.entities`. `shapes.test.ts` scans
`src/` for both mistakes.

**Convex masks a thrown `Error`, so a rule reads as a fault.** Anything that is not a
`ConvexError` reaches the browser as `[Request ID: …] Server Error` — right for an internal
failure, wrong for a deliberate refusal. `guest.admitIp` threw a plain `Error` at the
per-network cap, so /try told a capped visitor Mason was busy and offered a refresh that
could not work before midnight UTC. Refusals that a person is meant to act on throw
`ConvexError` with a code from `src/lib/try/guest-refusal.ts`; the wording lives on the
screen, never in the error. **And that code still does not reach the browser** — in the Next
integration `signIn` posts to /api/auth, and `convexAuthNextjsMiddleware`'s proxy forwards
only `error.message`, so `data` is dropped and the message is the masked one. A refusal the
browser must act on has to travel as an absence instead: `authorize` returns `null`, which
crosses the proxy as an ordinary 200 and arrives as `{ signingIn: false }`.

**There is no Prettier config in this repo.** Running `npx prettier --write` on a file
therefore applies Prettier's defaults — double quotes and semicolons — and rewrites the
whole file away from the house style, which is single quotes and no semicolons. It turned a
30-line change into a 126-line diff once. Edit by hand and match the file you are in.

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
