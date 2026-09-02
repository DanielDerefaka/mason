import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { POSITIONING } from "@/lib/brand";
import { AHREFS_ANALYTICS_KEY, AHREFS_ANALYTICS_SRC } from "@/lib/ahrefs";
import { DATAFAST_DOMAIN, DATAFAST_WEBSITE_ID } from "@/lib/datafast";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Two fonts that used to load here are gone from the root on purpose. Outfit
// was declared for the marketing pages and nothing ever set it: every family
// on those pages resolves to Geist, so it was a preloaded font on every route
// for zero glyphs. Manrope is the style guide's specimen face, and it loads
// with the specimen (`components/style-guide/typography.tsx`), the one
// component whose `font-display` resolves to it; from here it was preloaded
// on the landing page for a panel behind a session.

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// The italic serif behind `.font-display-italic`: a handful of words on the
// blog index and the about page. Not preloaded, because preloading put a
// variable font with three axes ahead of every page's first paint for those
// few words. The @font-face still ships in the stylesheet, so the browser
// fetches the file when text is set in it, and only then.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["italic"],
  axes: ["SOFT", "WONK", "opsz"],
  preload: false,
});

export const metadata: Metadata = {
  // The canonical host, hardcoded, and **www** on purpose: the apex 308s here,
  // so an og:url or a canonical on the bare domain names a URL that redirects.
  // A canonical that redirects is the one thing a canonical may not be — it
  // tells a crawler "index this", and the crawler finds a 308 and indexes the
  // other one anyway. Every share card was also costing a round trip.
  //
  // This read NEXT_PUBLIC_APP_URL before that: whatever tunnel or preview
  // happens to be running, which locally meant og:url advertised an ngrok
  // host. Polar still reads it (api/polar/checkout), where following the
  // running origin is correct; a social card is the opposite case.
  //
  // The host itself lives in `@/lib/site`, which robots.ts, sitemap.ts,
  // llms.txt and the homepage's structured data all read too — five places
  // that have to agree, and did not when they were five string literals.
  metadataBase: new URL(SITE_URL),
  // `template` is why no page below sets its own "| SketchMason" suffix by
  // hand: they did, back when the name was "Mason", and a template would have
  // made every title read "Blog | Mason · Mason". The home page opts out with
  // `absolute`, since its title already opens with the name.
  //
  // SketchMason is the public name; the product calls itself Mason. The rule,
  // and the structured data that tells a machine the two are one thing, live
  // in `@/lib/brand`.
  title: {
    default: "SketchMason: from a rough sketch to a finished UI design",
    template: "%s | SketchMason",
  },
  // The fallback for any page without a sentence of its own, and the one the
  // homepage repeats. It used to promise "working code" and "clean Tailwind
  // components you own", which is a different product: what comes out is a
  // design, exported as HTML or as a brief.
  description: POSITIONING,
  // The name browsers put on an installed web app, and one more signal the
  // site-name picker reads. Without it the only short name on the wire was
  // "Mason" from the product and from WebSite.alternateName.
  applicationName: "SketchMason",
  // "./" resolves against the *current* pathname, not against metadataBase —
  // `resolveRelativeUrl` in next/dist/lib/metadata/resolvers/resolve-url.js
  // posix-resolves it — so one line here gives every route its own canonical.
  // The alternative is a hardcoded string per page, which is a list that has
  // to be remembered, and the page nobody remembers is the one that ships
  // pointing at the home page.
  alternates: {
    canonical: "./",
  },
  // og:title and og:description are left to fall back to the two above, here
  // and on every child page: stating them twice is how the two drift apart,
  // and a page that sets a title then forgets its card is the common failure.
  openGraph: {
    siteName: "SketchMason",
    type: "website",
    // Same "./" trick, and the reason /explore, /blog and /download stopped
    // claiming to be the home page: this was "/", and openGraph.url is
    // inherited by every descendant, so every share card on the site named
    // the same URL.
    //
    // Which is also why no page below should declare `openGraph` merely to
    // set a url. A child's openGraph *replaces* this object rather than
    // merging into it — /try did exactly that and silently lost og:site_name
    // and og:type — so a page that wants its own card must restate the lot.
    // Inheriting is the safer default and now the correct one.
    url: "./",
  },
  // The card image itself comes from `app/opengraph-image.tsx`, by file
  // convention, and is inherited by every route that does not define its own —
  // /s/[token] does, because a shared design deserves its own picture.
  twitter: {
    card: "summary_large_image",
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Nothing here reads the request, and nothing may. A dynamic API in the
    // root layout opts every route on the site out of static rendering, and
    // the auth provider used to wrap <html> here so it could read the session
    // cookie during SSR: that one await was why /pricing rendered per request
    // with `cache-control: no-store` and streamed its <title> into the body.
    // The providers mount in the layouts whose screens use them
    // (`components/app-providers.tsx`), which read the same cookie from the
    // same request. One consequence: `isFreeWeek()` in the marketing layout is
    // read at build now, not per request. On Vercel that changes nothing,
    // since a change to the environment takes a redeploy to reach the server
    // either way.
    //
    // The theme is a class, not a provider. next-themes was mounted with the
    // system preference disabled and nothing ever called setTheme, so it was
    // a script in the head, a context and a hydration warning to arrive at
    // exactly this attribute. `color-scheme` keeps form controls and
    // scrollbars dark, which the provider used to set on the same element.
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${fraunces.variable} antialiased`}
      >
        <Script
          src="https://datafa.st/js/script.js"
          data-website-id={DATAFAST_WEBSITE_ID}
          data-domain={DATAFAST_DOMAIN}
          strategy="afterInteractive"
        />
        {/* lazyOnload: Ahrefs is a second count of a pageview DataFast has
            already taken, so it waits for the window's load event instead of
            contending with hydration for the main thread. DataFast stays
            afterInteractive so that an early bounce is still a pageview. */}
        <Script
          src={AHREFS_ANALYTICS_SRC}
          data-key={AHREFS_ANALYTICS_KEY}
          strategy="lazyOnload"
        />
        {children}
      </body>
    </html>
  );
}
