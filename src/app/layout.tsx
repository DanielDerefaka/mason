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
  // Open Graph images must be absolute URLs, and a share card is the first
  // place a relative one silently fails: the crawler sees a path and no host.
  // `||`, not `??`: the variable is defined-but-empty on a deployment where
  // someone cleared it, and `new URL("")` throws — which is every page of the
  // site failing to render, from a metadata line.
  // The canonical domain, hardcoded. This read NEXT_PUBLIC_APP_URL first, and
  // that variable is whatever the current tunnel or preview happens to be — a
  // local run advertised its ngrok host as og:url, and a stale value on the
  // deployment would point every share card at a URL nobody else can open.
  // Polar still reads it (api/polar/checkout), where following the running
  // origin is the correct behaviour; a social card is the opposite case.
  metadataBase: new URL("https://sketchmason.com"),
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
  // og:title and og:description are left to fall back to the two above, here
  // and on every child page: stating them twice is how the two drift apart,
  // and a page that sets a title then forgets its card is the common failure.
  openGraph: {
    siteName: "Mason",
    type: "website",
    url: "/",
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
