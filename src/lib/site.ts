/**
 * The canonical origin, in one place.
 *
 * www on purpose: the apex 308s here, so anything that names the bare domain —
 * a canonical, an og:url, a sitemap entry, a URL inside structured data —
 * names a redirect. `metadataBase` in the root layout, robots.ts and
 * sitemap.ts all resolve against this host, and if Vercel's primary domain is
 * ever flipped to the apex, this constant is the thing that moves.
 *
 * Not read from the environment. NEXT_PUBLIC_APP_URL is whatever tunnel or
 * preview happens to be running, and a share card built from it points at a
 * host nobody else can open.
 */
export const SITE_URL = 'https://www.sketchmason.com'
