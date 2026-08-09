"use client";

import Link from "next/link";
import { useEffect } from "react";

import { CloseIcon, LogoMark } from "@/components/marketing/icons";
import { HEADER_NAV } from "@/lib/marketing-nav";
import { cn } from "@/lib/utils";

/** Slide-in menu used below the 1001px desktop breakpoint. */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] lg:hidden",
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
          "bg-background absolute inset-y-0 right-0 flex w-full max-w-[360px] flex-col transition-transform duration-400 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-[72px] items-center justify-between px-6">
          <span className="flex items-center gap-2.5">
            <LogoMark className="text-foreground h-[22px] w-[22px]" />
            <span className="text-foreground text-[16px] font-bold tracking-[-0.16px]">
              Mason
            </span>
          </span>
          <button type="button" aria-label="Close menu" onClick={onClose}>
            <CloseIcon className="text-foreground h-6 w-6" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-6 pt-6">
          {HEADER_NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className="text-foreground border-hairline border-b py-4 text-[22px] tracking-[-0.5px]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-6">
          <Link
            href="/contact"
            onClick={onClose}
            className="pill pill-primary w-full justify-center"
          >
            Let&apos;s Connect
          </Link>
        </div>
      </div>
    </div>
  );
}
