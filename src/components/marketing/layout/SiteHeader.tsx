"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LogoMark, MenuIcon } from "@/components/marketing/icons";
import { HEADER_NAV, HOME_SECTION_IDS, SECTION_TO_NAV } from "@/lib/marketing-nav";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";

/**
 * Full-bleed sticky header, always translucent. The active nav item on the home
 * page is chosen by an IntersectionObserver over the page sections — not by click.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [activeSection, setActiveSection] = useState<string>("hero");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isHome) return;

    const sections = HOME_SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // The section occupying the middle band of the viewport wins.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.01, 0.5, 1] }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [isHome]);

  const activeLabel = isHome
    ? (SECTION_TO_NAV[activeSection] ?? "Home")
    : HEADER_NAV.find((n) => n.href !== "/" && pathname.startsWith(n.href))?.label;

  return (
    <>
      <header className="sticky top-0 z-[100] border-b border-hairline bg-[rgba(10,10,10,0.72)] backdrop-blur-[20px] backdrop-saturate-[1.4]">
        <div className="flex items-center justify-between px-6 py-3.5 md:px-8">
          <Link href="/" aria-label="Mason home" className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7 text-foreground" />
            <span className="font-display text-[1.15rem] font-medium tracking-[-0.02em] text-foreground">
              Mason
            </span>
          </Link>

          {/* Everything that is not the logo sits in one right-aligned row:
              page links, then Sign in, then the pill. The reference keeps
              the links flush against the actions rather than centred, and
              the links carry no padding of their own — the row's gap is the
              spacing. The logo is Home, so Home is dropped from the list. */}
          <nav className="hidden items-center gap-5 lg:flex xl:gap-7">
            {HEADER_NAV.filter((item) => item.href !== "/").map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "text-[0.85rem] transition-colors hover:text-foreground",
                  item.label === activeLabel ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/auth/sign-in"
              className="text-[0.85rem] text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            {/* `!` overrides beat `.marketing .pill`, which outranks a plain utility. */}
            <Link href="/auth/sign-up" className="pill pill-primary !px-5 !py-2 !text-[0.84rem]">
              Start free
            </Link>
          </nav>

          {/* Below lg the row collapses to the pill and the menu button. */}
          <div className="flex items-center gap-3 lg:hidden">
            <Link href="/auth/sign-up" className="pill pill-primary !px-4 !py-1.5 !text-[0.8rem]">
              Start free
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="text-foreground"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
