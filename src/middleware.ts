import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server'
import { isBypassRoute } from '@/lib/permissions'

const bypassMatcher = createRouteMatcher(isBypassRoute)

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (bypassMatcher(request)) return
    if (await convexAuth.isAuthenticated()) return
    return nextjsMiddlewareRedirect(request, '/auth/sign-in')
  },
  {
    // Without this the auth cookies are session cookies: closing the browser
    // ends the session. That is merely annoying for an account — you sign in
    // again — but for a guest it is the work itself, because an anonymous
    // session is the only handle on the projects it made. Thirty days.
    cookieConfig: { maxAge: 60 * 60 * 24 * 30 },
  },
)

export const config = {
  // Everything except Next internals and files with an extension.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
