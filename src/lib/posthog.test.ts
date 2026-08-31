import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('PostHog is opt-in', () => {
  it('does not initialise without a project key', () => {
    const client = read('src/instrumentation-client.ts')
    expect(client).toMatch(/posthogEnabled/)
    expect(client).toMatch(/posthog\.init\(POSTHOG_KEY/)
  })

  it('is named in .env.example, values blank', () => {
    const example = read('.env.example')
    expect(example).toMatch(/NEXT_PUBLIC_POSTHOG_KEY=$/m)
    expect(example).toMatch(/NEXT_PUBLIC_POSTHOG_HOST=$/m)
  })

  it('is named on the privacy page, so a visitor is told', () => {
    expect(read('src/lib/marketing-legal.ts')).toMatch(/PostHog/)
  })
})
