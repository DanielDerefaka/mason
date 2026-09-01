import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The tunnel used to test Polar webhooks and checkout returns. Next blocks
   * cross-origin dev requests otherwise, so the tunnelled app cannot load its
   * own assets.
   */
  allowedDevOrigins: ['splotchy-prorate-snugly.ngrok-free.dev'],
  // The dev badge sits bottom-left, exactly where the canvas puts undo and
  // redo, and it takes the clicks meant for them.
  devIndicators: false,

  /**
   * The desktop app.
   *
   * The whole application ships inside the Electron binary as a standalone
   * server and runs on the user's machine — except the three route families
   * that hold keys. A model key, a stock-photo key and a billing token can
   * never ship to end users, so those routes proxy to the deployment, and the
   * caller's Convex JWT rides the forwarded cookie: it is signed by Convex,
   * not by the host that set it, so production verifies it exactly as if the
   * request had come from the site. Credits and rate limits stay enforced
   * where the keys live.
   *
   * Both are opt-in by env so the web build is byte-identical to before.
   */
  ...(process.env.DESKTOP_BUILD ? { output: 'standalone' as const } : {}),
  async headers() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'mason-puce.vercel.app' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // Google's favicon cache held create-next-app's triangle (the one that
        // looks like Vercel's) after the mark shipped, in part because this
        // file was advertised as uncacheable. A week is long enough for the
        // crawler to treat the URL as a stable asset and short enough to pick
        // up a real change.
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
      },
    ]
  },
  async rewrites() {
    const upstream = process.env.DESKTOP_UPSTREAM
    if (!upstream) return []
    return ['generate', 'image', 'polar'].map((family) => ({
      source: `/api/${family}/:path*`,
      destination: `${upstream}/api/${family}/:path*`,
    }))
  },
};

/**
 * Source maps are uploaded only when there is a token to upload them with.
 *
 * The plugin is otherwise happy to run in a build that cannot authenticate,
 * and turns every deploy log into a wall of upload warnings — or fails it
 * outright. A repository without a Sentry account has to build exactly as it
 * did before, so the whole wrapper is opt-in on the token being present.
 *
 * Without maps, a production stack trace names minified frames. That is worth
 * far less than a readable one, which is why the token is worth setting — but
 * it is not worth a broken build to find out.
 */
const uploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default uploadSourceMaps
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // The build log is for build problems; upload chatter belongs in CI output.
      silent: true,
      // Strips the maps from the deployed bundle after they reach Sentry, so a
      // reader of the site cannot reconstruct the source from it.
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      // Routes browser events through this app's own domain, so an ad blocker
      // cannot quietly drop the reports that matter most.
      tunnelRoute: "/monitoring",
      disableLogger: true,
    })
  : nextConfig;
