import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { DATAFAST_DOMAIN, DATAFAST_WEBSITE_ID, datafastCrawlerConfig } from './datafast'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('DataFast bot traffic is server-side', () => {
  it('uses the same website id as the browser script', () => {
    expect(DATAFAST_WEBSITE_ID).toMatch(/^dfid_/)
    expect(DATAFAST_DOMAIN).toBe('sketchmason.com')
    const layout = read('src/app/layout.tsx')
    expect(layout).toMatch(/data-website-id=\{DATAFAST_WEBSITE_ID\}/)
    expect(layout).toMatch(/data-domain=\{DATAFAST_DOMAIN\}/)
  })

  /**
   * The regression this exists for: awaiting the call makes every request
   * wait on DataFast's network. The two-argument form with `event` is the
   * waitUntil path; the one-argument form returns a Promise.
   */
  it('fires from middleware without awaiting, and passes the fetch event', () => {
    const source = read('src/middleware.ts')
    expect(source).toMatch(/trackAICrawlerRequest\(request, event, datafastCrawlerConfig\(\)\)/)
    expect(source).not.toMatch(/await trackAICrawlerRequest/)
  })

  it('does not send an empty bot token', () => {
    const previous = process.env.DATAFAST_BOT_TOKEN
    delete process.env.DATAFAST_BOT_TOKEN
    expect(datafastCrawlerConfig()).toEqual({
      websiteId: DATAFAST_WEBSITE_ID,
      domain: DATAFAST_DOMAIN,
    })
    process.env.DATAFAST_BOT_TOKEN = 'dfbot_test'
    expect(datafastCrawlerConfig().authToken).toBe('dfbot_test')
    if (previous === undefined) delete process.env.DATAFAST_BOT_TOKEN
    else process.env.DATAFAST_BOT_TOKEN = previous
  })

  it('names the optional token in .env.example, value blank', () => {
    expect(read('.env.example')).toMatch(/^DATAFAST_BOT_TOKEN=$/m)
  })
})
