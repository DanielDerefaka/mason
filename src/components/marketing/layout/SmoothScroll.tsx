"use client";

import { useEffect } from "react";

/**
 * Anchor scrolling for the marketing pages, and momentum scrolling for the
 * pointers that suit it.
 *
 * Two things used to be one. Lenis ran on every marketing page, on every
 * device, turning every wheel and touch event into a JavaScript animation
 * frame; the in-page anchor handling that lands `/#services` under the sticky
 * header was written inside the same effect, so it existed only when Lenis
 * did. A phone got the frame loop it has no use for, and any browser that
 * skipped Lenis lost its anchors too.
 *
 * The anchor handler is now unconditional and needs no library: `scrollTo`
 * with the element's own offset does what `lenis.scrollTo(..., -68)` did.
 * Lenis is loaded only for a fine pointer, and only when the visitor has not
 * asked for less motion — a mouse wheel is what it smooths, and a trackpad or
 * a touchscreen already scrolls smoothly on its own.
 */
export function SmoothScroll() {
  useEffect(() => {
    // The sticky header is 68px tall; land the section just beneath it.
    const HEADER = 68;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href*="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      const hash = href.includes("#") ? href.slice(href.indexOf("#")) : "";
      if (hash.length < 2) return;
      const path = href.split("#")[0];
      if (path && path !== "/" && path !== window.location.pathname) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER;
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
      window.history.replaceState(null, "", hash);
    };

    document.addEventListener("click", onClick);

    // Nothing below this line runs on a phone, a tablet or a reduced-motion
    // browser, and the import is what keeps Lenis out of their bundle.
    let stop: (() => void) | null = null;
    if (!reduced && window.matchMedia("(pointer: fine)").matches) {
      void import("lenis").then(({ default: Lenis }) => {
        const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
        let frame = requestAnimationFrame(function raf(time: number) {
          lenis.raf(time);
          frame = requestAnimationFrame(raf);
        });
        stop = () => {
          cancelAnimationFrame(frame);
          lenis.destroy();
        };
      });
    }

    return () => {
      document.removeEventListener("click", onClick);
      stop?.();
    };
  }, []);

  return null;
}
