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

export default nextConfig;
