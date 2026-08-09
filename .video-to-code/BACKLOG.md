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

## Chapters not built

- **24 — Polar billing.** Credits exist as a real balance in Convex with a
  starting grant and per-generation spend, but nothing sells them.
  `credits:grant` tops accounts up from the CLI in the meantime. Polar replaces
  the top-up path, not the ledger.
- **31 — Design chat.** Revising a generated screen conversationally.
- **32 — Pre-deploy notes**, **33 — Deploy on Sevalla.**
- **Export design.** Referenced by chapter 28's pill row alongside Generate
  Workflow and Design Chat; only the workflow pill is built.

## Deferred earlier

- **Google OAuth.** Needs a Google Cloud OAuth client and a tunnel, since
  Google will not call `localhost`. The Google and Microsoft buttons on the
  sign-in page are inert; email and password work.
- **Inngest background jobs.** The creator sets Inngest up in chapter 22 and
  then leaves streaming on the request path, flagging "move it to a background
  job" as homework — a browser closed mid-generation loses the design today.
- **Chapter 19's inspector panel** and **chapter 21's per-frame chat window**,
  both partially skipped at the time.

## Tooling

- **Downstream cookie support.** YouTube now blocks the local Downstream API
  with a bot check; transcripts and frames need
  `yt-dlp --cookies-from-browser chrome`. The server does not pass cookies yet,
  so every chapter needs a manual workaround.
