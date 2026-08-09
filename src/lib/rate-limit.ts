import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'

/**
 * A per-user ceiling on generation requests.
 *
 * Credits bound what an account can spend in total; this bounds how fast. A
 * loop against /api/generate otherwise burns a balance and the same number of
 * concurrent model calls as fast as the network allows.
 *
 * In-memory, which is the honest shape for a single Node process: it resets on
 * deploy and does not span instances. That is a real limitation and it is
 * still worth having — the attack it stops is a script hammering one server,
 * not a distributed one. Moving the counter into Convex is the upgrade when
 * the app runs on more than one instance.
 */
const WINDOW_MS = 60_000
const MAX_REQUESTS = 8

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

/** Drops expired buckets so the map cannot grow without bound. */
const sweep = (now: number) => {
  if (buckets.size < 500) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number }

/**
 * Keyed by the auth token rather than IP: the routes are already behind auth,
 * and an IP is shared by everyone behind one office NAT.
 */
export const checkRateLimit = async (): Promise<RateLimitResult> => {
  const token = await convexAuthNextjsToken().catch(() => null)
  // No token means the middleware will reject the request anyway.
  if (!token) return { ok: true }

  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(token)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(token, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }

  if (bucket.count >= MAX_REQUESTS) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { ok: true }
}
