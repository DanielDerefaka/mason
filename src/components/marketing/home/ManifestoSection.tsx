"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { INTRODUCTION } from "@/lib/marketing-content";

/** Unlit and lit word colours — `text-faint` and `text-foreground` as RGB triples. */
const UNLIT = [115, 115, 115] as const;
const LIT = [245, 245, 245] as const;

/**
 * How many words ahead of the wipe front are part-way lit. A ramp of three
 * reads as a soft edge sweeping across the paragraph; a ramp of one flips
 * words on like switches.
 */
const RAMP = 3;

/** Blend from unlit to lit at `t` in [0, 1]. */
function wordColour(t: number): string {
  const r = Math.round(UNLIT[0] + (LIT[0] - UNLIT[0]) * t);
  const g = Math.round(UNLIT[1] + (LIT[1] - UNLIT[1]) * t);
  const b = Math.round(UNLIT[2] + (LIT[2] - UNLIT[2]) * t);
  return `rgb(${r},${g},${b})`;
}

/**
 * The pinned statement whose words brighten as the page scrolls past it.
 *
 * The outer section is taller than the viewport (160svh) and the content
 * sticks to the top of it, so the reader scrolls "through" the paragraph
 * while it stays put. Progress is how far the section's top has travelled
 * above the viewport, as a fraction of the room the extra height gives it.
 *
 * Only that one number lives in state; each word's colour is derived in
 * render. Per-word state would mean forty setState calls per scroll frame
 * for nothing — the whole paragraph re-renders either way.
 *
 * The `id` is load-bearing: SiteHeader's IntersectionObserver watches it.
 */
export function ManifestoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // A reader who has asked for less motion gets the finished paragraph,
    // not a wipe they have to scroll to complete.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduceMotion(true);
      return;
    }

    let frame = 0;

    const measure = () => {
      frame = 0;
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const room = rect.height - window.innerHeight;
      // If the viewport is taller than the section there is no scroll room;
      // show the paragraph lit rather than stuck at its first word.
      const next = room > 0 ? Math.min(1, Math.max(0, -rect.top / room)) : 1;
      setProgress(next);
    };

    // Scroll events arrive far faster than frames paint; one measurement per
    // frame is all the eye can use.
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    measure();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  const words = INTRODUCTION.statement.split(" ");
  const front = progress * words.length;

  return (
    <section ref={sectionRef} id="introduction" className="relative h-[160svh]">
      <div className="sticky top-0 flex h-[100svh] items-center">
        <div className="container-home">
          <div className="mx-auto max-w-[880px] text-center">
            <span className="eyebrow">{INTRODUCTION.eyebrow}</span>

            <p className="font-display text-[clamp(1.5rem,3.2vw,2.1rem)] leading-[1.3] font-medium tracking-[-0.02em]">
              {words.map((word, index) => {
                // Fully lit once the front has passed the word; part-lit for
                // the RAMP words just ahead of it.
                const t = reduceMotion
                  ? 1
                  : Math.min(1, Math.max(0, (front - index) / RAMP + 1));

                return (
                  <span key={index} style={{ color: wordColour(t) }}>
                    {word}{" "}
                  </span>
                );
              })}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={INTRODUCTION.primaryCta.href} className="pill pill-secondary">
                {INTRODUCTION.primaryCta.label}
              </Link>
              <Link
                href={INTRODUCTION.secondaryCta.href}
                className="px-3 text-[0.9rem] text-muted-foreground transition-colors hover:text-foreground"
              >
                {INTRODUCTION.secondaryCta.label} <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
