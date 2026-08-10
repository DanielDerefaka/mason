# Backlog

Things deliberately left undone, and why. Ordered roughly by how much they'd
improve the product per hour spent.

## Design quality

**Annotated sketches.** The creator's demo sketch is labelled — "Image should
take full height of this section", "Product Image", "Add To Cart", "Accordion
1", "$49.99", "Nav1 Nav2 Nav3" — so the model reads intent rather than guessing
it from rectangles. Our sketches have been unlabelled boxes, partly because the
text tool only started working on 2026-08-09. Worth testing an annotated sketch
against an unlabelled one on the same reference before touching anything else;
this is likely a bigger lever than any prompt or model change.

**A second extraction pass over the references.** The prompt now makes the
model read a reference against a checklist — what carries the page, its
signature device, scale, light, density, component anatomy — before writing.
That is one model call doing two jobs. The clone-website skill's rule is that
extraction and construction are separate, and that "if a builder has to guess
anything you have failed at extraction". The stronger version here is a pass
that runs once when references are uploaded, returns a structured brief
(layout anatomy, hero treatment, imagery role, signature devices, type scale,
light behaviour), stores it on the project, and passes it to every generation
after. Costs one call per board rather than one per design.

**A real image source.** loremflickr matches keywords loosely and returns
whatever is popular, which is how a page about a quiet laptop was illustrated
with a cat statue — twice, in the hero and a feature card. The prompt now
mitigates it (texture keywords for large slots, a mandatory scrim, one lock
per slot) but the cause is the source. An Unsplash or Pexels API key with a
curated query would fix it properly, and would also allow orientation and
colour filters, which is what a hero actually needs.

**Topical imagery keywords.** Photographic slots pull from
`loremflickr.com/{w}/{h}/{keywords}?lock={n}`. The model picks the keywords, and
picks them badly when the product is abstract — a project-workspace landing page
came back illustrated with a vintage kitchen dresser. Options: derive keywords
from the style guide's theme, pass a short keyword list from the project, or let
the user set them per project.

**Reference fidelity.** Generated designs currently track the reference's
*content* as well as its look — same headline, same statistics, same section
copy. The prompt says to borrow the look only and it is being ignored. Fine for
a personal test, a plagiarism risk for anything shipped. Fix is a prompt change;
left alone because "how close to the reference" is a product decision, not a
technical one.

**Model choice.** Measured on one sketch and reference, `claude-opus-5` gave
13.4k of markup in 65s; `gpt-5.6-sol` gave 7.5k in 99s, left two of three stat
figures blank, and put low-contrast text in the nav. Opus 5 is the default.
`ANTHROPIC_UI_MODEL` switches the design model without touching the model used
for extraction. Worth re-running whenever the router adds a model.

## Landing page

Rebuilt from the user's own reference site and then cut back. Still open:

- **Social proof.** No user count to quote yet. Put a real figure in when
  there is one.
- **Per-post blog art.** Every post shares one placeholder cover; the field is
  a single constant in `marketing-blog.ts` when each gets its own.

## Chapters not built

- **24 — Polar billing.** Credits exist as a real balance in Convex with a
  starting grant and per-generation spend, but nothing sells them.
  `credits:grant` tops accounts up from the CLI in the meantime. Polar replaces
  the top-up path, not the ledger.
- **32 — Pre-deploy notes**, **33 — Deploy on Sevalla.**

## Deferred earlier

- **Google OAuth.** Needs a Google Cloud OAuth client and a tunnel, since
  Google will not call `localhost`. The Google and Microsoft buttons on the
  sign-in page are inert; email and password work.
- **Inngest background jobs.** The creator sets Inngest up in chapter 22 and
  then leaves streaming on the request path, flagging "move it to a background
  job" as homework — a browser closed mid-generation loses the design today.
- **Chapter 21's per-frame chat window**, partially skipped at the time.

## From the structural survey (9 Aug 2026)

Lanes 1, 2 and 4 are done. What the audit raised and this backlog still owes:

- **RTE-04 — undo dies with the tab.** `past`/`future` are Redux-only, so a
  reload loses 50 steps. The durable answer is version history — periodic
  named snapshots on the project document — not a longer undo stack.
- **CNV-09 — grouping.** Needs multi-select, which now exists. Lower priority
  than it looks: sketches here are throwaway input.
- **CNV-11 — space-to-pan.** Works via shift-drag, an undocumented modifier
  nobody will guess.
- **CNV-12 — comments and presence.** Convex would make this cheap when it is
  time. Later-stage.
- **CNV-13 — auto layout.** Deliberately skipped. Mason's sketches are input,
  not maintained artboards.
- **POL-03 — entitlement TODOs.** `query.config.ts` stubs the check to always
  pass and `dashboard/page.tsx` hardcodes the billing redirect against it.
  Harmless until billing exists; exactly the lines that will bite when it does.

## Editable generated output

The idea worth building next, and the one Figma cannot copy: First Draft stops
accepting prompts once you hand-edit a design. Ours does not have to.

Generated output is HTML with inline styles — already a tree with computed
styles on every node — so "convert to editable" is a selection layer over that
DOM, not a new tool. The inspectors already edit the properties involved, and
the layers panel is the same tree walk.

The decision that has to come first: **manual edits must survive
regeneration.** Store them as a patch keyed to stable node ids and re-apply
after each generation. Get that wrong and every revision wipes the user's
edits, which is exactly the failure mode that makes First Draft a one-shot
tool.

Downstream of it: host a design on a public route, export to JSX, push to
Figma via their REST API.

## Tooling

- **Downstream cookie support.** YouTube now blocks the local Downstream API
  with a bot check; transcripts and frames need
  `yt-dlp --cookies-from-browser chrome`. The server does not pass cookies yet,
  so every chapter needs a manual workaround.
