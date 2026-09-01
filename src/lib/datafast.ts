import type { DataFastCrawlerTrackingConfig } from '@datafast/ai-crawl'

/**
 * DataFast, as one pair of identifiers.
 *
 * The website id is public by design: it is the same `dfid_` the browser
 * script already prints in the root layout. Bot-traffic tracking is a
 * separate server call to the same website, and if the two ids drifted a
 * crawler hit would land in a different dashboard than the pageviews.
 *
 * `DATAFAST_DOMAIN` is the root, not www: DataFast's website is registered
 * on sketchmason.com, and the script's `data-domain` has always said so.
 */
export const DATAFAST_WEBSITE_ID = 'dfid_6YC1RxSs1SLge4Me6Am0C'
export const DATAFAST_DOMAIN = 'sketchmason.com'

/**
 * Server-side bot-traffic options. The optional token is a `dfbot_` from
 * the Bot traffic card; it is not the public website id, and it must never
 * appear in the browser script. Unset, tracking still works until that
 * card is set to reject unauthenticated requests.
 */
export function datafastCrawlerConfig(): DataFastCrawlerTrackingConfig {
  const authToken = process.env.DATAFAST_BOT_TOKEN
  return {
    websiteId: DATAFAST_WEBSITE_ID,
    domain: DATAFAST_DOMAIN,
    ...(authToken ? { authToken } : {}),
  }
}
