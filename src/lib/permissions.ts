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
  // The questions page, read by people with no account and by the crawlers
  // that quote it. Adding a marketing page to the middleware matcher without
  // adding it here is the trap: the matcher makes the middleware run, and
  // anything not bypassed is a redirect to the sign-in page. /faq shipped
  // exactly that for the length of one build.
  '/faq(.*)',
  '/pricing(.*)',
  '/privacy(.*)',
  '/terms(.*)',
  '/compare(.*)',
  '/sketch-to-ui(.*)',
  // The landing page too. As a public route it bounced signed-in visitors to
  // the dashboard, so anyone with an account could never reach their own
  // marketing site again without signing out — and the header on /blog and
  // /about-us links straight to it.
  '/',
  // The free canvas, the gallery and the admission endpoint. Bypass, and
  // emphatically not public: a public route bounces any authenticated session
  // to the dashboard, and a guest on /try *is* an authenticated session (an
  // anonymous one). Listed as public, /try would bounce its own visitors to
  // /dashboard, which sends anonymous users back to /try — a loop.
  '/try(.*)',
  '/explore(.*)',
  '/api/try/(.*)',
  // The auth screens. They were public, which was right until guests existed:
  // a public route bounces *any* authenticated session to /dashboard, and the
  // dashboard sends an anonymous one back to /try. A guest who clicked "Keep
  // your work" could therefore never reach a sign-up form — the one path out
  // of a guest session was the one path the middleware would not allow.
  // Bypassed here, and src/app/auth/layout.tsx does the bouncing instead: it
  // can tell a real account from an anonymous one, which the middleware cannot.
  '/auth/(.*)',
]

/**
 * Everything not bypassed needs a session. There is no third category any
 * more: "public" used to mean "reachable signed out, and redirected away when
 * signed in", and the redirect half of that is what locked guests out of
 * signing up. Where a signed-in visitor should be sent elsewhere, the page's
 * own layout decides — it knows whether the session is an account or a guest.
 */
