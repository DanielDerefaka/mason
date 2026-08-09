import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev badge sits bottom-left, exactly where the canvas puts undo and
  // redo, and it takes the clicks meant for them.
  devIndicators: false,
};

export default nextConfig;
