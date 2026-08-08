/**
 * Routes the auth middleware treats specially.
 *
 * Bypass routes skip the auth check entirely — webhooks and provider callbacks
 * have no session cookie and must not be redirected.
 */
export const isBypassRoute = ['/api/auth(.*)', '/api/webhooks(.*)']

/** Reachable while signed out. A signed-in user hitting one is sent to the dashboard. */
export const isPublicRoutes = ['/', '/auth/sign-in', '/auth/sign-up']
