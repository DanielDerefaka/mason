import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'

import { Toaster } from '@/components/ui/sonner'
import { ConvexClientProvider } from '@/convex/provider'
import { ReduxProvider } from '@/redux/provider'

/**
 * The application's runtime: the auth session, the Convex client, the Redux
 * store and the toast rail.
 *
 * These wrapped <html> in the root layout, for every route on the site, and
 * two things followed. `ConvexAuthNextjsServerProvider` awaits `cookies()`,
 * and a dynamic API in the root layout opts every route out of static
 * rendering: /pricing answered `cache-control: private, no-cache, no-store`
 * with a CDN MISS on every request, and Next streamed its <title>,
 * description and canonical into the body (byte 20,443 of a 53,991-byte
 * document, with </head> closed at 2,364) for any crawler not on its
 * html-limited list, which is GPTBot, ClaudeBot, PerplexityBot and Googlebot.
 * And the Convex client, the store with the whole canvas reducer tree, and
 * sonner shipped to someone reading a pricing page that used none of them.
 *
 * So the providers live here, and only the layouts whose screens use them
 * mount it: (protected), /try, /auth and /s. The cookie is just as readable
 * from a nested layout, which is a server component rendered in the same
 * request; the root never had to be the one to read it. The marketing group
 * mounts nothing and prerenders at build. /explore, the one page in that
 * group that subscribes to the backend, takes a plain public client of its
 * own instead.
 *
 * The toast rail is lifted clear of the canvas toolbar, which puts zoom in
 * the bottom-right corner sonner otherwise lands in.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>
        <ReduxProvider>
          {children}
          <Toaster theme="dark" offset={{ bottom: '96px' }} />
        </ReduxProvider>
      </ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  )
}
