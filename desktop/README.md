# Mason for desktop

The application ships inside the binary. `webapp/` holds the standalone Next
build — the same code as the site — and Electron boots it on a loopback port
and opens a window onto it. Data goes straight from the app to Convex;
sign-in happens locally against the same deployment as the web.

The one thing that stays remote is anything holding a key. The `generate`,
`image` and `polar` route families are rewritten at build time to proxy to
the deployment, and the caller's Convex JWT rides the forwarded cookie — it
is signed by Convex, not by the host that set it, so production verifies it
exactly as if the request came from the site. Credits and rate limits stay
enforced where the keys live. Verified by header: through the local server,
`/api/image/*` answers `server: Vercel`; `/auth/sign-in` answers
`X-Powered-By: Next.js`.

There is no landing page here: the window opens at `/dashboard`, and the
middleware bounces a signed-out user to sign-in.

```bash
cd desktop
npm install
npm run bundle     # builds the web app for desktop and folds it into webapp/
npm start          # boots the bundled server and opens the window
npm run dev        # the shell pointed at localhost:3000 instead
npm run smoke      # boots windowless, asserts the page loaded, exits
npm run dist       # .dmg / .zip into desktop/release (unsigned without Apple creds)
npm run smoke:dist # smoke the PACKAGED app — run after every dist, no exceptions
```

`npm run bundle` refuses to run while the dev server is up — `next build`
rewrites `.next` underneath it. It builds with the production Convex URL and
upstream by default; override with `NEXT_PUBLIC_CONVEX_URL` /
`DESKTOP_UPSTREAM` for a staging build.

## What the shell owns

- **The bundled server**, forked as a utility process on `127.0.0.1:34115`,
  killed on quit. Packaged, it lives in `Resources/app-server` beside the
  asar — Next reads its build output with plain `fs`, which does not see
  inside an asar.
- **A custom menu**, and it is load-bearing: Electron's default menu binds
  ⌘+/⌘−/⌘0 and ⌘Z as accelerators, handled before the page sees the
  keystroke — it would silently break canvas zoom and undo. Undo/Redo remain
  as menu items for text fields, without accelerators.
- **The origin rule**: `localhost` and `127.0.0.1` both count as inside (the
  middleware's redirects swap one for the other); everything else opens in
  the default browser — including checkout, which belongs in the browser
  people already trust with payments.
- Window size and position persist across launches.

The name and dock icon are Mason's in dev too — `build/icon.png` is the brand
mark recomposed to Apple's dock proportions (tile at ~82% of the canvas,
22% corner radius), and it is swapped in at runtime because dev runs inside
Electron's own binary.

## Updating

The app updates itself. On launch it fetches a manifest from the rolling
`webapp-latest` release, and a newer payload is downloaded, sha256-verified,
extracted into userData and booted on the next launch — no reinstall and,
while the binary is unsigned, no Gatekeeper: the executable never changes.
Shipping an app update is:

```bash
npm run bundle          # rebuild the payload from the current tree
npm run publish:webapp  # tar, hash, replace the rolling release assets
```

Installed apps pick it up on their next launch. Only shell changes (main.js,
Electron itself) still need a dmg release — that tier waits on notarisation,
after which electron-updater can carry it too.

## Not done yet

- **Signing/notarisation** — `npm run dist` is unsigned; distribution needs
  an Apple Developer ID in the config.
- **Deep links** (`mason://`) for opening share links straight into the app.
- **`ELECTRON_RUN_AS_NODE`** — VS Code exports it, which makes `electron .`
  run as plain Node; the npm scripts strip it, so always launch through them.
