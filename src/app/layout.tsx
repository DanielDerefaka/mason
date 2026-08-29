import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Manrope, Inter, Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/convex/provider";
import { ReduxProvider } from "@/redux/provider";
import { ThemeProvider } from "@/theme/provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The style guide specimen font.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

// Marketing typography. Outfit stands in for the reference's GT Walsheim, which
// is a trial cut and not licensed for production — its own notes call the swap a
// one-line change, and this is that line.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["italic"],
  axes: ["SOFT", "WONK", "opsz"],
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
  // If Vercel's primary domain is ever flipped to the apex, this line, robots.ts
  // and sitemap.ts are the three places that have to move together.
  metadataBase: new URL("https://www.sketchmason.com"),
  // `template` is why no page below sets its own "| Mason" suffix any more:
  // they did, and a template would have made every title read "Blog | Mason ·
  // Mason". The home page opts out with `absolute`, since its title already
  // opens with the word.
  title: {
    default: "Mason — sketch to code",
    template: "%s · Mason",
  },
  description:
    "Draw your UI, get working code. Mason turns rough sketches into clean Tailwind components you own.",
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
    siteName: "Mason",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The server provider has to sit outside <html> so it can read the auth
    // cookie during SSR; the client provider goes inside <body>.
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${outfit.variable} ${inter.variable} ${fraunces.variable} antialiased`}
        >
          <Script
            src="https://datafa.st/js/script.js"
            data-website-id="dfid_6YC1RxSs1SLge4Me6Am0C"
            data-domain="sketchmason.com"
            strategy="afterInteractive"
          />
          <ConvexClientProvider>
            <ReduxProvider>
              <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              disableTransitionOnChange
            >
                {children}
                {/* Lifted clear of the canvas toolbar, which puts zoom in the
                    bottom-right corner sonner otherwise lands in. */}
                <Toaster offset={{ bottom: '96px' }} />
              </ThemeProvider>
            </ReduxProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
