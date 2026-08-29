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
npm run smoke        # 32 live checks against a running server
npm run smoke:browser # 5 pages in a real headless Chrome, for what smoke cannot see
npm test             # 869 unit tests, no server needed
npm run icons        # favicon.ico and apple-icon.png, regenerated from icon.svg
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

**Both of /try's ceilings are Convex environment variables, and blank is not zero.**
`COMMUNITY_POOL_SIZE` (default 20) and `GUEST_SESSIONS_PER_IP_PER_DAY` (default 10) are read
per call through `limitFromEnv` in `src/lib/try/limits.ts`, so `npx convex env set …` moves
them live — which is the only useful shape for a cap that counts a *network*, when an office
or campus NAT trips it mid-week. Both accept a real `0` as an off switch, which is why the
empty string had to stop meaning zero: `Number('')` is `0`, so `npx convex env set
COMMUNITY_POOL_SIZE ""` would have emptied the pool for the whole site with every check
still green.

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

**A robots.txt disallow does not keep a page out of the index — it hides the tag that
would.** `/auth/` was disallowed, and the brand SERP grew a "Sign in" sitelink anyway:
Google indexed the URL from the header link without ever reading the page, and listed it
with no snippet. A `noindex` on a disallowed page is never seen. `/auth/*` sends
`robots: { index: false }` from its layout and is deliberately *not* in `robots.ts`;
`metadata.test.ts` pins both halves, because a disallow added back would quietly
re-create the sitelink.

**A share card under a route group is not served at `/opengraph-image`.** Next appends a
hash of the parent path to any metadata route whose path has a `(group)` or `@slot` segment
in it, so `(marketing)/blog/[slug]/opengraph-image.tsx` answers at
`/blog/<slug>/opengraph-image-yqks0s` and the plain URL is a 404. The `og:image` tag Next
writes is right on its own; anything that spells the URL by hand — the BlogPosting `image`
did — must carry the suffix. It is djb2 of `"/(marketing)/blog/[slug]"`, so it moves only
when the directory does; `blog.test.ts` recomputes it with Next's own `fillMetadataSegment`,
and `smoke` fetches whatever card the page advertises rather than a path written into the
script.

**A call to action must not be conditional on `FREE_WEEK`.** `/try` is public with
or without the week, so a link that points at `/auth/sign-up` "outside the week" is a
sign-up wall on a site whose header and /faq both say no account is needed. `CtaSection`
closes all seven marketing pages and did exactly that whenever the flag was unset — the
half nobody was looking at, because the flag was on. It reads no flag now, and
`free-week.test.ts` pins the absence. The switch's only job is `/auth/*`.

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

**A route that only displays something must not mint a guest session.** /try/editor and
/try/preview both read a project out of their own URL, so they are useful only to the
browser holding that session — and a browser without one owns no project either. They
mounted `TryGuestGate` in its minting form anyway, so opening a preview link on a second
screen signed that browser in as a new guest, spent one of the network's ten daily
sessions, and rendered an empty page; at the cap it showed the refusal screen to someone
looking at their own work. They pass `admit={false}` now and say where the work actually
is. `guest-gate.test.ts` sweeps `src/app/try` so a new route there has to decide.

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

**`app/icon.svg` is not the icon Google shows.** Next serves it beside `app/favicon.ico`, and
Google's favicon picker takes the .ico. That file was still create-next-app's — a white
triangle in a black circle — for three weeks after the mark went into the SVG, so the brand
results wore the starter's icon; nobody opens a .ico, so nothing noticed until a search did.
Both raster icons are derived from the SVG now: `npm run icons` writes favicon.ico (48, 32
and 16, largest first — Google wants a 48, and Next advertises the file at the size of its
*first* entry, which is how production's link tag said `16x16` with a 48 in the file) and
apple-icon.png (180, square to the edge, because iOS masks it and paints black under
transparency), and `icons.test.ts` renders the SVG and fails if either file drifts from it. Google re-crawls favicons on its own schedule, so the results lag a fix
here by days. That is latency, not a failed fix.

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

The public name is SketchMason; the product calls itself Mason. Marketing pages, metadata,
share cards, structured data and /llms.txt say SketchMason — with `alternateName: 'Mason'`
on both JSON-LD blocks, which is what tells a machine the two are one entity — and the
canvas, the editor and everything behind a session say Mason. `src/lib/brand.ts` holds the
positioning sentence and the Organization block. The category is sketch-to-*design* with an
HTML export: never "sketch to code", never "production-ready components";
`metadata.test.ts` refuses both across the public surface. The Next.js project starter (`exportDesignProject`) is named on /faq and nowhere else — never in a title, a meta description, a share card or /llms.txt; the same test pins that. `hello@mason.design` stays until
a sketchmason.com inbox exists.

Copy a visitor can read carries no em dash. The founder's call, made on reading the site on
2026-08-29: they read as machine-written. A comma, a colon or a full stop does the same job,
a toast with two clauses is a title plus a `description`, and `metadata.test.ts` fails on one
anywhere across the public surface, the blog posts, the /try screens and the strings behind
them. Comments and model prompts may still use them.

Never invent an API key. `.env.example` carries names only.
