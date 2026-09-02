import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * Every marketing page rendered per request, because the root layout wrapped
 * <html> in `ConvexAuthNextjsServerProvider`, which awaits the session cookie.
 * One dynamic API in the root opts the whole site out of static rendering:
 * /pricing answered `cache-control: private, no-cache, no-store` with a CDN
 * miss on every request, and Next streamed its <title> into the body (byte
 * 20,443 of a 53,991-byte document, </head> closed at 2,364) for any crawler
 * not on its html-limited list, which is GPTBot, ClaudeBot and PerplexityBot.
 * The providers mount in the four layouts whose screens use them now, and
 * the root reads nothing from the request.
 */
describe('the root layout is static', () => {
  const root = withoutComments(read('src/app/layout.tsx'))

  it('mounts no provider', () => {
    for (const name of [
      'ConvexAuthNextjsServerProvider',
      'ConvexClientProvider',
      'ReduxProvider',
      'ThemeProvider',
      'next-themes',
      'AppProviders',
      '<Toaster',
    ]) {
      expect(root, name).not.toContain(name)
    }
  })

  it('reads nothing from the request', () => {
    expect(root).not.toMatch(/\b(cookies|headers|draftMode)\(/)
    expect(root).not.toMatch(/next\/headers/)
    expect(root).not.toMatch(/export const dynamic/)
  })

  // next-themes was mounted with the system preference off and nothing ever
  // called setTheme, so a script, a context and a hydration warning existed to
  // arrive at this one attribute.
  it('sets the theme as a class on <html>, which is all next-themes was doing', () => {
    expect(root).toMatch(/<html[^>]*className="dark"/)
    expect(root).toMatch(/colorScheme: "dark"/)
  })
})

describe('the app layouts mount the providers the root no longer does', () => {
  it.each([
    'src/app/(protected)/layout.tsx',
    'src/app/try/layout.tsx',
    'src/app/auth/layout.tsx',
    'src/app/s/layout.tsx',
  ])('%s mounts AppProviders', (path) => {
    const source = withoutComments(read(path))
    expect(source).toMatch(/import \{ AppProviders \} from '@\/components\/app-providers'/)
    expect(source).toMatch(/<AppProviders>/)
  })

  it('AppProviders holds the auth, Convex and Redux providers and the toast rail', () => {
    const source = withoutComments(read('src/components/app-providers.tsx'))
    expect(source).toMatch(/<ConvexAuthNextjsServerProvider>/)
    expect(source).toMatch(/<ConvexClientProvider>/)
    expect(source).toMatch(/<ReduxProvider>/)
    expect(source).toMatch(/<Toaster theme="dark"/)
  })

  // The toaster asked next-themes for a theme it could only ever answer "dark"
  // to. Without the provider it must say so itself.
  it('the toaster defaults to dark without a theme provider', () => {
    const source = withoutComments(read('src/components/ui/sonner.tsx'))
    expect(source).not.toMatch(/next-themes/)
    expect(source).toMatch(/theme = "dark"/)
  })
})

describe('/explore renders per request, and says so', () => {
  const source = withoutComments(read('src/app/(marketing)/explore/page.tsx'))

  // The build must never reach the backend: the production build deploys the
  // Convex functions in the same run, and a preview build points at dev.
  it('is force-dynamic, with no revalidate to put the fetch back into the build', () => {
    expect(source).toMatch(/export const dynamic = 'force-dynamic'/)
    expect(source).not.toMatch(/export const revalidate/)
  })

  it('takes a public Convex client, not the app providers', () => {
    expect(source).toMatch(/<PublicConvex>/)
    expect(source).not.toMatch(/AppProviders/)
    const provider = withoutComments(read('src/components/explore/provider.tsx'))
    expect(provider).toMatch(/from 'convex\/react'/)
    expect(provider).not.toMatch(/@convex-dev\/auth/)
  })
})

/**
 * `htmlLimitedBots` replaces Next's default list rather than extending it.
 * A list that named only the answer engines would have handed Twitterbot and
 * Bingbot a streamed head, which is the regression this pins against.
 */
describe('html-limited bots', () => {
  it('names the answer engines and keeps every default', () => {
    const config = withoutComments(read('next.config.ts'))
    const match = config.match(/htmlLimitedBots:\s*\/(.+)\/i,/)
    expect(match).not.toBeNull()
    const bots = new RegExp(match![1], 'i')
    for (const agent of [
      'GPTBot',
      'OAI-SearchBot',
      'ClaudeBot',
      'PerplexityBot',
      'Twitterbot',
      'Bingbot',
      'facebookexternalhit',
      'LinkedInBot',
      'Slackbot',
      'Mediapartners-Google',
      'Google-InspectionTool',
    ]) {
      expect(agent, agent).toMatch(bots)
    }
  })
})

/**
 * Both SDKs were static imports of `instrumentation-client.ts`, which Next
 * runs before hydration on every page, so Sentry and PostHog were the largest
 * scripts on /pricing, ahead of React, for a page that uses neither.
 */
describe('the browser SDKs load after the page', () => {
  const source = withoutComments(read('src/instrumentation-client.ts'))

  it('instrumentation-client has no static import of Sentry or PostHog', () => {
    expect(source).not.toMatch(/^import .*from '(@sentry\/nextjs|posthog-js)'/m)
    expect(source).toMatch(/import\('@sentry\/nextjs'\)/)
    expect(source).toMatch(/import\('posthog-js'\)/)
  })

  it('still hands Next a router transition hook', () => {
    expect(source).toMatch(/export const onRouterTransitionStart/)
  })

  it('never loads the session recorder', () => {
    expect(source).toMatch(/disable_session_recording: true/)
  })
})

describe('fonts', () => {
  const root = withoutComments(read('src/app/layout.tsx'))

  // Outfit was declared for the marketing pages and nothing ever set it.
  it('the root layout no longer loads Outfit', () => {
    expect(root).not.toMatch(/Outfit/)
    expect(root).not.toMatch(/font-outfit/)
    expect(withoutComments(read('src/app/globals.css'))).not.toMatch(/font-outfit/)
  })

  it('Manrope loads with the specimen that uses it', () => {
    expect(root).not.toMatch(/Manrope/)
    const specimen = read('src/components/style-guide/typography.tsx')
    expect(specimen).toMatch(/Manrope\(\{/)
    expect(specimen).toMatch(/variable: '--font-manrope'/)
    expect(specimen).toMatch(/\$\{manrope\.variable\}/)
  })

  it('Fraunces is not preloaded, for the few words set in it', () => {
    const fraunces = root.slice(root.indexOf('Fraunces({'))
    expect(fraunces.slice(0, fraunces.indexOf('})'))).toMatch(/preload: false/)
  })
})

describe('the route error screen', () => {
  // A root error.tsx ships with every route, and this one carried an icon
  // library and the Button primitive to pages that used neither.
  it('imports no icon library and no button primitive', () => {
    const source = withoutComments(read('src/app/error.tsx'))
    expect(source).not.toMatch(/lucide-react/)
    expect(source).not.toMatch(/@\/components\/ui\/button/)
    expect(source).toMatch(/<svg/)
  })
})

describe('third-party scripts', () => {
  const root = withoutComments(read('src/app/layout.tsx'))

  it('Ahrefs waits for load; DataFast does not', () => {
    const ahrefs = root.slice(root.indexOf('src={AHREFS_ANALYTICS_SRC}'))
    expect(ahrefs.slice(0, ahrefs.indexOf('/>'))).toMatch(/strategy="lazyOnload"/)
    const datafast = root.slice(root.indexOf('datafa.st'))
    expect(datafast.slice(0, datafast.indexOf('/>'))).toMatch(/strategy="afterInteractive"/)
  })

  it('the press badge is lazy', () => {
    const footer = read('src/components/marketing/layout/SiteFooter.tsx')
    const badge = footer.slice(footer.indexOf('src={badge.src}'))
    expect(badge.slice(0, badge.indexOf('/>'))).toMatch(/loading="lazy"/)
    expect(badge.slice(0, badge.indexOf('/>'))).toMatch(/decoding="async"/)
  })
})
