import Link from "next/link";

import {
  ArrowRightIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  LogoMark,
  TwitterIcon,
} from "@/components/marketing/icons";
import { CONTACT, COPYRIGHT, FOOTER_COLUMNS, SOCIAL_LINKS } from "@/lib/marketing-nav";
import { freeWeekHref } from "@/lib/try/free-week";

/**
 * Keyed by label, and the lookup returns null for anything unlisted — which is
 * what lets `SOCIAL_LINKS` be the only place a social account is added or
 * removed. The three unused entries are kept for the day their accounts exist.
 */
const SOCIAL_ICONS = {
  X: TwitterIcon,
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  LinkedIn: LinkedInIcon,
} as const;

/**
 * `freeWeek` comes from the server layout. During the week the remaining auth
 * links in the columns bend to the canvas too, since /auth/* redirects there.
 */
export function SiteFooter({ freeWeek = false }: { freeWeek?: boolean }) {
  // The email form goes to the canvas whether or not the week is on. It used
  // to post to /auth/sign-up outside the week, which is the same contradiction
  // the header had: a footer promising "free" that opens a registration form.
  //
  // The address is not lost in the move — the form is a plain GET, and the
  // canvas reads `?email=` in email-gate-dialog.tsx exactly as the sign-up page
  // did, so whatever was typed here is already filled in on arrival.
  const startHref = "/try";
  // Every auth link, not just sign-up: /auth/* redirects to /try during the
  // week, and "Sign in" sitting in the footer of a no-account trial was the
  // exact contradiction this closes.
  const linkHref = (href: string) => freeWeekHref(href, freeWeek);

  return (
    <footer className="relative border-t border-hairline bg-surface px-6 py-10 md:px-8 md:py-12">
      {/* Brighter run along the top edge so the surface reads as lifted, not just darker. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.14] to-transparent"
      />

      <div className="container-home !px-0">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-8">
          <div>
            <Link href="/" aria-label="SketchMason home" className="inline-flex items-center gap-2.5">
              <LogoMark className="h-7 w-7 text-foreground" />
              <span className="font-display text-[1.15rem] font-medium tracking-[-0.02em] text-foreground">
                SketchMason
              </span>
            </Link>
            <p className="mt-4 max-w-[280px] text-[0.85rem] leading-relaxed text-muted-foreground">
              Finished interfaces from the roughest sketch you can draw.
            </p>

            {/* Plain GET: /try prefills from `?email=`, so no client JS is needed. */}
            <form
              className="mt-6 flex max-w-[320px] items-center gap-2"
              action={startHref}
              method="get"
            >
              <label htmlFor="footer-email" className="sr-only">
                Email
              </label>
              <input
                id="footer-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@studio.com"
                className="h-10 flex-1 rounded-full border border-border bg-transparent px-4 text-[0.85rem] text-foreground outline-none placeholder:text-faint focus:border-white/30"
              />
              <button
                type="submit"
                aria-label="Try it free — no sign-up"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:-translate-y-0.5"
              >
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-2 text-[0.75rem] text-faint">
              No sign-up, no card. Just draw something.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-[0.7rem] font-medium uppercase tracking-[0.08em] text-faint">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={linkHref(link.href)}
                      className="text-[0.85rem] leading-[1.6] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-[0.8rem] text-faint">{COPYRIGHT}</p>
            <a
              href={`mailto:${CONTACT.email}`}
              className="text-[0.8rem] text-faint transition-colors hover:text-foreground"
            >
              {CONTACT.email}
            </a>
          </div>

          <div className="flex items-center gap-2">
            {SOCIAL_LINKS.map((social) => {
              const Icon = SOCIAL_ICONS[social.label as keyof typeof SOCIAL_ICONS];
              if (!Icon) return null;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
