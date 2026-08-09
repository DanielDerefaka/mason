"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LogoMark, MenuIcon } from "@/components/marketing/icons";
import { HEADER_NAV, HOME_SECTION_IDS, SECTION_TO_NAV } from "@/lib/marketing-nav";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Full-bleed 72px header. Transparent at the top of the page, translucent + blurred once
 * content scrolls beneath it. The active nav item on the home page is chosen by an
 * IntersectionObserver over the page sections — not by click.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 h-[72px] transition-colors duration-300",
          scrolled && "bg-background/70 backdrop-blur-xl"
        )}
      >
        <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between px-6 md:px-10 lg:px-[60px]">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Sketch to Design home">
            <LogoMark className="h-[22px] w-[22px] text-foreground" />
            <span className="font-sans text-[16px] leading-4 font-bold tracking-[-0.16px] text-foreground">
              Sketch to Design
            </span>
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex">
            {HEADER_NAV.map((item) => {
              const active = item.label === activeLabel;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "text-[14px] leading-[22.4px] transition-colors duration-300",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            <ThemeToggle />
            <Link
              href="/auth/sign-up"
              className="pill pill-secondary hidden !px-[15px] !py-[8px] !text-[12px] !leading-[19.2px] sm:inline-flex"
            >
              Start free
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="text-foreground lg:hidden"
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
