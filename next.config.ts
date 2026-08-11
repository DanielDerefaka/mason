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
