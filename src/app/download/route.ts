/**
 * /download used to be the Mac build. The page was pulled with a 404 on
 * purpose, so the URL could come back after notarisation without Google
 * having been taught that it moved. That was right for a regular result.
 * A sitelink is stickier: the brand SERP still advertised "Download | Mason"
 * days later, because a 404 is "not here today". 410 is "not coming back",
 * which is the signal that drops a sitelink. A 308 to / would have kept the
 * link and just pointed it at the home page, still labelled Download.
 *
 * If the Mac page returns, it is a 200 on this path again. Google recrawls
 * 410s. No HTML body: a pretty page behind a 410 is read as a real page.
 * The Removals tool in Search Console is still the fast path; this is what
 * the crawler finds when it next asks.
 */
export function GET() {
  return new Response('Gone', {
    status: 410,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
