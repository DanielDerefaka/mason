import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { AHREFS_ANALYTICS_KEY, AHREFS_ANALYTICS_SRC } from './ahrefs'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('Ahrefs Web Analytics', () => {
  it('prints one script tag with the project data-key, not the Tag Manager duplicate', () => {
    const layout = read('src/app/layout.tsx')
    expect(layout).toMatch(/src=\{AHREFS_ANALYTICS_SRC\}/)
    expect(layout).toMatch(/data-key=\{AHREFS_ANALYTICS_KEY\}/)
    expect(layout).not.toMatch(/createElement\('script'\)/)
    expect(AHREFS_ANALYTICS_SRC).toBe('https://analytics.ahrefs.com/analytics.js')
    expect(AHREFS_ANALYTICS_KEY.length).toBeGreaterThan(8)
  })

  it('is named on the privacy page, so a visitor is told', () => {
    const legal = read('src/lib/marketing-legal.ts')
    expect(legal).toMatch(/Ahrefs/)
    expect(legal).toMatch(/DataFast and Ahrefs/)
  })
})
