/**
 * Routes the auth middleware treats specially.
 *
 * Bypass routes skip the auth check entirely — webhooks and provider callbacks
 * have no session cookie and must not be redirected.
 */
export const isBypassRoute = [
  '/api/auth(.*)',
  '/api/webhooks(.*)',
  // The public site. Bypass rather than public: a public route bounces a
  // signed-in visitor to the dashboard, and reading the blog or the about page
  // should not depend on being signed out.
  '/blog(.*)',
  '/about-us(.*)',
]

/**
 * Reachable while signed out. A signed-in user hitting one is sent to the
 * dashboard — which is why the blog is a bypass route instead: it is public
 * reading, and signing in should not lock you out of it.
 */
export const isPublicRoutes = ['/', '/auth/sign-in', '/auth/sign-up']
