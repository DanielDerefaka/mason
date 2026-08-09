/**
 * Routes the auth middleware treats specially.
 *
 * Bypass routes skip the auth check entirely — webhooks and provider callbacks
 * have no session cookie and must not be redirected.
 */
export const isBypassRoute = ['/api/auth(.*)', '/api/webhooks(.*)', '/blog(.*)']

/**
 * Reachable while signed out. A signed-in user hitting one is sent to the
 * dashboard — which is why the blog is a bypass route instead: it is public
 * reading, and signing in should not lock you out of it.
 */
export const isPublicRoutes = ['/', '/auth/sign-in', '/auth/sign-up']
