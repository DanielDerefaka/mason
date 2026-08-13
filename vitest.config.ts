import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Unit tests only — nothing here starts a server or calls a model.
 *
 * The suites cover the pure layer: the reducer, the DOM helpers the editor is
 * built on, the sanitiser, and the image pipeline. That is deliberate. Four
 * defects reached a working build during development — a selection ring baked
 * into saved designs, a wheel listener that never attached, a flex floor that
 * silently refused to shrink, and a reference image rejected for being large
 * instead of resized — and three of the four are decidable without a browser.
 * Those three are the specification for this suite.
 *
 * The fourth needs a real page, which is what `npm run smoke` is for.
 *
 * jsdom throughout rather than per-file, because the editor helpers are only
 * meaningful against a DOM and the reducer does not care either way.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
  // The panel tests render components, so JSX has to compile without a
  // React import in every file.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
