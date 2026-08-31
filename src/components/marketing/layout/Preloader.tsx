"use client";

import { useEffect, useState } from "react";

import { LogoMark } from "@/components/marketing/icons";
import { cn } from "@/lib/utils";

const SESSION_KEY = "mason-preloaded";

/**
 * The reference holds a black screen with its mark for a beat before revealing the page.
 * Shown once per session, not on every client-side navigation.
 */
export function Preloader() {
  const [state, setState] = useState<"hidden" | "showing" | "leaving">("hidden");

  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      return;
    }

    // Whether the preloader has already run this session is client-only state.
    setState("showing");
    document.documentElement.style.overflow = "hidden";

    const leave = window.setTimeout(() => setState("leaving"), 1400);
    const done = window.setTimeout(() => {
      setState("hidden");
      window.sessionStorage.setItem(SESSION_KEY, "1");
      document.documentElement.style.overflow = "";
    }, 2100);

    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
      document.documentElement.style.overflow = "";
    };
  }, []);

  if (state === "hidden") return null;

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-700",
        state === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      )}
    >
      <LogoMark className="h-10 w-10 animate-pulse text-white" />
    </div>
  );
}
