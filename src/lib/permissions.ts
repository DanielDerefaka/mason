/**
 * Routes the auth middleware treats specially.
 *
 * Bypass routes skip the auth check entirely — webhooks and provider callbacks
 * have no session cookie and must not be redirected.
 */
export const isBypassRoute = [
  '/api/auth(.*)',
  '/api/webhooks(.*)',
  // Polar signs its requests; the signature is the credential, and the auth
  // middleware would otherwise redirect every event to the sign-in page.
  '/api/polar/webhook',
  // The public site. Bypass rather than public: a public route bounces a
  // signed-in visitor to the dashboard, and reading the blog or the about page
  // should not depend on being signed out.
  // A share link is read by people with no account; the token is the
  // credential, so the middleware must not ask for a session.
  '/s/(.*)',
  // The photographs inside a design. A shared design is read by people with no
  // account, and an <img> that redirects to the sign-in page is a design full
  // of broken pictures. There is nothing behind this route to protect: it
  // resolves a stock search and redirects to a public CDN.
  '/api/image/(.*)',
  '/blog(.*)',
  '/about-us(.*)',
  // The desktop download. Public reading like the blog, and bypass for the
  // same reason: being signed in should not hide the installer.
  '/download(.*)',
  // The landing page too. As a public route it bounced signed-in visitors to
  // the dashboard, so anyone with an account could never reach their own
  // marketing site again without signing out — and the header on /blog and
  // /about-us links straight to it.
  '/',
]

/**
 * Reachable while signed out. A signed-in user hitting one is sent to the
 * dashboard — which is why the blog is a bypass route instead: it is public
 * reading, and signing in should not lock you out of it.
 */
export const isPublicRoutes = [
  '/auth/sign-in',
  '/auth/sign-up',
  // Whoever needs this is by definition not signed in, so leaving it out
  // bounced them to the page they could not get past.
  '/auth/forgot-password',
]
