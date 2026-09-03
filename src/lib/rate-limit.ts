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

/**
 * Two allowances, because two kinds of request share these routes.
 *
 * Writing a page is a minute of model time and a credit; editing one element
 * in the editor is seconds and a credit. They drew on one bucket of eight,
 * so a person who generated twice and then reworded six headings in the
 * editor was refused the seventh with "Too many requests", while a script
 * could still take the same eight. An edit is what the editor is for, and
 * eight of anything in a minute is a working session, not an attack; twenty
 * edits is still nowhere near what a loop would ask for.
 */
export type RateLimitBucket = 'generation' | 'edit'
const MAX_REQUESTS: Record<RateLimitBucket, number> = { generation: 8, edit: 20 }

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
 * and an IP is shared by everyone behind one office NAT. The bucket name is
 * part of the key, so a token's edits and generations are counted apart.
 */
export const checkRateLimit = async (
  bucket: RateLimitBucket = 'generation',
): Promise<RateLimitResult> => {
  const token = await convexAuthNextjsToken().catch(() => null)
  // No token means the middleware will reject the request anyway.
  if (!token) return { ok: true }

  const now = Date.now()
  sweep(now)

  const key = `${bucket}:${token}`
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }

  if (current.count >= MAX_REQUESTS[bucket]) {
    return { ok: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
  }

  current.count += 1
  return { ok: true }
}
