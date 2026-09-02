import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const layout = readFileSync(join(process.cwd(), 'src/app/(marketing)/layout.tsx'), 'utf8')

/**
 * The inline script that opts the marketing tree into the scroll-in adds
 * `reveal-js` to its parent while the HTML is still being parsed, so React
 * hydrates into an element carrying a class it never rendered. Without
 * `suppressHydrationWarning` on that element, React logs a hydration error on
 * every marketing page. The pages looked fine, so nobody saw it; only
 * `smoke:browser` did, and it failed `/` and `/explore` on it.
 */
describe('the reveal-js opt-in', () => {
  it('lands on an element that expects the mismatch', () => {
    expect(layout).toContain("classList.add('reveal-js')")
    const host = layout.match(/<div className="marketing[^>]*>/)?.[0]
    expect(host).toContain('suppressHydrationWarning')
  })
})
