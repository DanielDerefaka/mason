import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server'
import { isBypassRoute, isPublicRoutes } from '@/lib/permissions'

const bypassMatcher = createRouteMatcher(isBypassRoute)
const publicMatcher = createRouteMatcher(isPublicRoutes)

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (bypassMatcher(request)) return

  const isAuthenticated = await convexAuth.isAuthenticated()

  if (publicMatcher(request) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, '/dashboard')
  }

  if (!publicMatcher(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, '/auth/sign-in')
  }
})

export const config = {
  // Everything except Next internals and files with an extension.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
