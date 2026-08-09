"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { FEATURED_PROJECTS, PROJECT_COUNT } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

/**
 * The reference's title drifts down at roughly a third of the scroll rate —
 * measured at 282px of travel across 828px of page scroll.
 */
const PARALLAX_RATE = 0.34;
/** Cap the drift so the title never wanders into the first card. */
const PARALLAX_MAX = 300;

/** Mobile (<= 750px) kills the parallax — it reads as jitter on touch. */
const MOBILE_QUERY = "(max-width: 750px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * "Our Works" — the long stacked gallery.
 *
 * Two scroll-driven behaviours define it:
 *   1. the title parallaxes at ~1/3 the scroll rate, and
 *   2. each card resolves from blur to focus once it enters the viewport.
 *
 * The blur reveal is deliberately one-way: cards are unobserved the moment they
 * resolve, so scrolling back up never re-blurs them.
 *
 * The `id` is load-bearing: SiteHeader's IntersectionObserver watches it.
 */
export function FeaturedWorksSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);

  const [revealed, setRevealed] = useState<boolean[]>(() =>
    FEATURED_PROJECTS.map(() => false),
  );

  /* ---------------------------------------------------------------- *
   * Blur-to-focus reveal.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const nodes = cardRefs.current.filter(
      (node): node is HTMLLIElement => node !== null,
    );
    if (nodes.length === 0) return;

    if (typeof IntersectionObserver === "undefined") {
      // Feature detection is only possible on the client; reveal everything up front.
      setRevealed(FEATURED_PROJECTS.map(() => true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const index = Number(
            (entry.target as HTMLElement).dataset.cardIndex ?? "-1",
          );
          if (index < 0) continue;

          setRevealed((previous) => {
            if (previous[index]) return previous;
            const next = [...previous];
            next[index] = true;
            return next;
          });

          // One-way: never re-blur on the way back up.
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    for (const node of nodes) observer.observe(node);

    return () => observer.disconnect();
  }, []);

  /* ---------------------------------------------------------------- *
   * Title parallax — rAF-throttled, reading the section's rect.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const title = titleRef.current;
    const section = sectionRef.current;
    if (!title || !section) return;

    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    const mobile = window.matchMedia(MOBILE_QUERY);

    let frame = 0;
    let attached = false;

    const reset = () => {
      title.style.transform = "translate3d(0, 0, 0)";
    };

    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      // 0 the instant the section's top touches the viewport bottom, then grows.
      const travelled = window.innerHeight - rect.top;
      const offset = Math.min(
        Math.max(travelled * PARALLAX_RATE, 0),
        PARALLAX_MAX,
      );
      title.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const detach = () => {
      if (!attached) return;
      attached = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      reset();
    };

    const attach = () => {
      if (attached) return;
      attached = true;
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      update();
    };

    const sync = () => {
      if (reducedMotion.matches || mobile.matches) detach();
      else attach();
    };

    sync();
    reducedMotion.addEventListener("change", sync);
    mobile.addEventListener("change", sync);

    return () => {
      reducedMotion.removeEventListener("change", sync);
      mobile.removeEventListener("change", sync);
      detach();
    };
  }, []);

  return (
    <section id="featured-works" ref={sectionRef} className="pb-[80px]">
      <div className="container-site">
        {/* Title — parallaxed, occupying the top of the section. */}
        <div className="flex min-h-[300px] items-center justify-center overflow-hidden md:min-h-[520px] lg:min-h-[800px]">
          <h2
            ref={titleRef}
            className={cn(
              "text-foreground font-display text-center font-normal will-change-transform",
              "text-[44px] leading-[46px] tracking-[-2px]",
              "md:text-[80px] md:leading-[80px] md:tracking-[-4px]",
              "lg:text-[118px] lg:leading-[118px] lg:tracking-[-6px]",
            )}
          >
            Our <span className="font-display-italic">Works</span>
          </h2>
        </div>

        {/* Stacked gallery. */}
        <ul className="flex list-none flex-col gap-[56px] md:gap-[90px] lg:gap-[130px]">
          {FEATURED_PROJECTS.map((project, index) => {
            const isRevealed = revealed[index];

            return (
              <li
                key={project.slug}
                data-card-index={index}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                style={{
                  filter: isRevealed ? "blur(0px)" : "blur(18px)",
                  opacity: isRevealed ? 1 : 0.5,
                  transform: isRevealed
                    ? "translateY(0px)"
                    : "translateY(28px)",
                  transition:
                    "filter 0.9s ease, opacity 0.9s ease, transform 0.9s ease",
                }}
              >
                <Link
                  href="/works"
                  aria-label={project.name}
                  className="group relative block w-full overflow-hidden rounded-[12px]"
                  style={{ aspectRatio: "1130 / 706" }}
                >
                  <div
                    className="absolute inset-0 scale-100 group-hover:scale-[1.03]"
                    style={{ transition: "transform 0.6s ease" }}
                  >
                    <Image
                      src={project.featureImage ?? project.image}
                      alt={project.name}
                      fill
                      sizes="(max-width: 750px) 100vw, 1130px"
                      className="object-cover"
                    />
                  </div>

                  {/* Hover affordance. */}
                  <span
                    aria-hidden="true"
                    className="pill pill-secondary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                    style={{ transition: "opacity 0.4s ease" }}
                  >
                    View Project
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Footer row. */}
        <div className="mt-[80px] flex flex-wrap items-center justify-center gap-[24px]">
          <Link href="/works" className="pill pill-secondary">
            View All
          </Link>

          <span className="flex items-center gap-[10px]">
            <span className="text-muted-foreground font-display text-[20px] tracking-[2px]">
              [
            </span>
            <span className="text-muted-foreground font-display text-[20px] tracking-[2px]">
              {PROJECT_COUNT}
            </span>
            <span className="text-muted-foreground font-display text-[20px] tracking-[2px]">
              ]
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
