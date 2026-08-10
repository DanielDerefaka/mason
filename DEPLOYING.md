# Deploying

Two systems, deployed together. Next runs on Vercel; the database, auth and
scheduled work run on Convex. The build command in `vercel.json` pushes the
Convex functions first and only builds Next if that succeeded, so the two can
never drift apart:

    npx convex deploy --cmd 'npm run build'

Without that command Vercel builds a frontend that calls Convex functions which
were never deployed. It fails at runtime rather than at build time, which is
the slowest possible way to find out.

## The order matters

There is one circular dependency, and everything awkward about this sequence
comes from it: **Convex needs to know the site's URL, and the URL does not
exist until the site has been deployed once.** So the first deploy is expected
to have broken sign-in. That is normal — step 5 fixes it.

### 1. Create the production Convex deployment

The local `.env.local` points at a *dev* deployment. Production is a separate
one with its own database and its own environment.

    npx convex deploy

### 2. Give it auth keys

Production does not inherit the dev deployment's keys.

    npx @convex-dev/auth --prod

This writes `JWKS` and `JWT_PRIVATE_KEY` into the production deployment. Do not
copy them across by hand.

### 3. Get a deploy key for Vercel

Convex dashboard → the project → Settings → **Generate Production Deploy Key**.
This is what lets Vercel's build push functions.

### 4. Import the repo on Vercel

Vercel → Add New → Project → import `mason`. Leave the build command alone;
`vercel.json` already carries it.

Set these environment variables on the Vercel project:

| Variable | Where it comes from |
| --- | --- |
| `CONVEX_DEPLOY_KEY` | step 3 |
| `ANTHROPIC_API_KEY` | required — every generation route fails without it |
| `PEXELS_API_KEY` | optional — without it photo slots render a grey panel |
| `POLAR_ACCESS_TOKEN` | optional, billing only |
| `POLAR_ORGANIZATION_ID` | optional, billing only |
| `POLAR_PRODUCT_ID` | optional, billing only |
| `POLAR_SERVER` | `sandbox` while testing, `production` for real cards |
| `POLAR_WEBHOOK_SECRET` | optional, billing only — **also** step 5 |
| `BILLING_ENFORCED` | leave unset until you want the paywall on |

`NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` are **not** set by hand —
`convex deploy` writes them during the build from the deploy key.

Deploy. Sign-in will not work yet.

### 5. Tell Convex where the site lives

Now that a URL exists, close the loop. Use the real domain if you have one, not
the per-deployment `*-git-*.vercel.app` URL, which changes on every push.

    npx convex env set --prod SITE_URL https://your-domain.com
    npx convex env set --prod POLAR_WEBHOOK_SECRET <the same value as Vercel>
    npx convex env set --prod AUTH_RESEND_KEY <optional, for password reset>

`SITE_URL` is what auth callbacks redirect to. `POLAR_WEBHOOK_SECRET` genuinely
lives in both places: the Next route verifies Polar's signature with it, and
Convex uses it to reject any write that did not come from that route. Miss the
Convex copy and subscriptions fail in the worst available way — the signature
verifies, the write is refused, Polar retries forever, and a paying customer is
never activated. `/billing` warns when it is missing.

Redeploy on Vercel so the new Convex environment is picked up.

### 6. Point Polar at production

In Polar, set the webhook URL to `https://your-domain.com/api/polar/webhook`.
The signing secret must match what both Vercel and Convex hold.

## Checking it

    npm test                       # 161 unit tests, no server needed
    SMOKE_BASE=https://your-domain.com npm run smoke

The smoke run is the useful one against a live deployment: it checks that
public pages render, that protected pages turn an anonymous visitor away, that
every generation route refuses an unauthenticated POST, and that the webhook
rejects an unsigned payload. It never calls a model, so it costs nothing.

## Afterwards

- Convex dev and Convex production are separate databases. Nothing you created
  while developing exists in production.
- `npx convex env list --prod` shows names and values for the production
  deployment. Everything it prints is a secret.
