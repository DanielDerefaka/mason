"use client";

import Link from "next/link";
import { useEffect } from "react";

import { CloseIcon, LogoMark } from "@/components/marketing/icons";
import { HEADER_NAV } from "@/lib/marketing-nav";
import { cn } from "@/lib/utils";

/** Slide-in menu used below the `lg` desktop breakpoint. */
export function MobileNav({
  open,
  onClose,
  freeWeek = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Threaded from the server layout via the header; see SiteHeader. */
  freeWeek?: boolean;
}) {
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    // Sits above the z-[100] header so the bar is covered while the menu is open.
    <div
      className={cn(
        "fixed inset-0 z-[110] lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-[360px] flex-col border-l border-hairline bg-[#0f0f0f] transition-transform duration-400 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-[68px] items-center justify-between px-6">
          <span className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7 text-foreground" />
            <span className="font-display text-[1.15rem] font-medium tracking-[-0.02em] text-foreground">
              SketchMason
            </span>
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="text-foreground"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex flex-col px-6 pt-4">
          {HEADER_NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className="border-b border-hairline py-3.5 font-display text-[1.35rem] font-medium tracking-[-0.03em] text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 p-6">
          {/* Hidden during the free week for the same reason as the desktop
              header's: /auth/* redirects to /try while the week is on. */}
          {!freeWeek && (
            <Link href="/auth/sign-in" onClick={onClose} className="pill pill-secondary w-full">
              Sign in
            </Link>
          )}
          {/* The canvas whether or not the week is on, matching the header and
              the hero. Full copy here: the pill is w-full, so there is room. */}
          <Link href="/try" onClick={onClose} className="pill pill-primary w-full">
            Try it free, no sign-up
          </Link>
        </div>
      </div>
    </div>
  );
}
