"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Drives the `.reveal` → `.revealed` scroll-in defined in globals.css.
 *
 * One observer for the whole marketing tree rather than a hook per section:
 * sections stay server components and only opt in with a class name. The
 * marketing layout persists across client-side navigation, so the scan is
 * re-run on every pathname change — otherwise a page reached by <Link> would
 * keep its sections at opacity 0.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!nodes.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((n) => n.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      },
      // Fire once the element is a little way into the viewport, not at the
      // very edge, so the settle is visible rather than already finished.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
