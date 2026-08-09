"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** One entry of the alternating values timeline. */
type ValueEntry = {
  title: string;
  body: string;
};

/**
 * Page-specific copy — deliberately NOT in mock-data, since nothing else
 * on the site consumes it.
 */
const VALUES: ValueEntry[] = [
  {
    title: "Structure First",
    body: "A layout is a decision, not a guess. The sketch you draw is what decides the screen — the model fills it in, it does not invent it.",
  },
  {
    title: "Systems, Not Screens",
    body: "Colour and type are bound to roles before anything is drawn, so the fifth screen still belongs to the same product as the first.",
  },
  {
    title: "Legibility Is Not Optional",
    body: "Every foreground is checked against the surface it sits on. A palette that reads beautifully and fails a contrast pairing is not finished.",
  },
  {
    title: "Show The Work",
    body: "Designs stream in as they are written. You should be able to tell a run is going wrong in seconds, not after the full minute.",
  },
  {
    title: "Nothing Is Precious",
    body: "Everything autosaves, a drag is one undo step, and a revision that fails puts back the design you already had.",
  },
];

/** Award badges — the wide pair keep their 826x171 aspect at an ~78px cap. */
const BADGES = [
  { src: "/images/s2c-canvas.png", width: 78, height: 78, alt: "Design award badge" },
  { src: "/images/s2c-colours.png", width: 78, height: 78, alt: "Design award badge" },
  { src: "/images/s2c-workflow.png", width: 377, height: 78, alt: "Design award badge" },
  { src: "/images/s2c-dashboard.png", width: 377, height: 78, alt: "Design award badge" },
];

/** Brightens a phrase to the foreground colour without bolding it. */
function Hl({ children }: { children: React.ReactNode }) {
  return <span className="text-foreground">{children}</span>;
}

/**
 * The /about-us body. Client-side because the values timeline owns a one-way
 * IntersectionObserver reveal; header and footer come from the root layout,
 * so the top padding here clears the fixed 72px header.
 */
export function AboutContent() {
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [revealed, setRevealed] = useState<boolean[]>(() => VALUES.map(() => false));

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      // The motion preference is only readable on the client; skip the animation.
      setRevealed(VALUES.map(() => true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const index = Number((entry.target as HTMLElement).dataset.index);
          setRevealed((prev) => {
            if (prev[index]) return prev;
            const next = [...prev];
            next[index] = true;
            return next;
          });

          // One-way: never re-hide once seen.
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.4 },
    );

    for (const element of itemRefs.current) {
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section className="pt-[140px] pb-[80px] md:pt-[180px] md:pb-[110px] lg:pt-[222px] lg:pb-[140px]">
      <div className="container-site">
        {/* 1 — Title */}
        <h1 className="text-foreground font-display text-center text-[44px] leading-[46px] font-normal tracking-[-2px] md:text-[80px] md:leading-[80px] md:tracking-[-4px] lg:text-[118px] lg:leading-[118px] lg:tracking-[-6px]">
          About <span className="font-display-italic">Us</span>
        </h1>

        {/* 2 — Watermark + intro */}
        <div className="relative mt-[48px] md:mt-[64px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
          >
            <Image
              src="/images/s2c-canvas.png"
              alt=""
              width={150}
              height={150}
              className="h-auto w-[150px] opacity-[0.06] blur-[2px]"
            />
          </div>

          <div className="relative z-10 mx-auto flex max-w-[620px] flex-col gap-[32px]">
            <p className="text-muted-foreground text-center font-sans text-[17px] leading-[28px]">
              <Hl>Sketch to Design</Hl> turns the roughest thing you can draw into{" "}
              <Hl>a finished interface</Hl>. Rectangles on a canvas become a real screen,
              built from a design system read out of your own mood board.
            </p>
            <p className="text-muted-foreground text-center font-sans text-[17px] leading-[28px]">
              Every project begins with understanding and ends with precision. Our goal is
              to design experiences that feel effortless and intentional while delivering
              measurable results that help <Hl>brands grow</Hl> and{" "}
              <Hl>perform better online.</Hl>
            </p>
          </div>
        </div>

        {/* 3 — Award badges */}
        <div className="mt-[56px] flex flex-wrap items-center justify-center gap-[32px] md:mt-[72px]">
          {BADGES.map((badge) => (
            <Image
              key={badge.src}
              src={badge.src}
              alt={badge.alt}
              width={badge.width}
              height={badge.height}
              className="h-[78px] w-auto opacity-90"
            />
          ))}
        </div>

        {/* 4 — Our Philosophy */}
        <div className="mt-[100px] md:mt-[140px]">
          <h2 className="text-foreground font-display text-center text-[30px] leading-[34px] font-normal tracking-[-1.3px]">
            Our Philosophy
          </h2>
          <p className="text-muted-foreground mx-auto mt-[18px] max-w-[620px] text-center font-sans text-[17px] leading-[28px]">
            Most tools ask you to describe a screen in a sentence. We think you should
            draw it. A sketch carries layout, proportion and reading order in a way no
            paragraph does — so we read the shape you made and let the words do the part
            they are good at, which is saying what a thing means.
          </p>
        </div>

        {/* 5 — Our Values (alternating timeline) */}
        <div className="mt-[100px] md:mt-[150px]">
          <h2 className="text-foreground font-display text-center text-[30px] leading-[34px] font-normal tracking-[-1.3px]">
            Our Values
          </h2>

          <div className="relative mx-auto mt-[56px] w-full max-w-[980px] md:mt-[80px]">
            {/* Centre rail — pinned left below 751px, centred above it. */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-px bg-[var(--hairline)] md:left-1/2 md:-translate-x-1/2"
            />

            <ul className="relative">
              {VALUES.map((value, index) => {
                const isLeft = index % 2 === 0;
                const isRevealed = revealed[index];

                return (
                  <li
                    key={value.title}
                    data-index={index}
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    className={cn(
                      "relative transition-[opacity,transform] duration-700 ease-[ease]",
                      index > 0 && "mt-[64px] md:mt-[120px]",
                      isRevealed
                        ? "translate-y-0 opacity-100"
                        : "translate-y-[20px] opacity-[0.15]",
                    )}
                  >
                    {/* Tick into the rail. */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-[14px] left-0 h-px w-[48px] bg-[var(--hairline)]",
                        isLeft
                          ? "md:right-1/2 md:left-auto"
                          : "md:left-1/2 md:translate-x-0",
                      )}
                    />

                    <div className="flex pl-[72px] md:pl-0">
                      <div
                        className={cn(
                          "md:w-1/2",
                          isLeft
                            ? "md:pr-[48px] md:text-right"
                            : "md:order-2 md:pl-[48px] md:text-left",
                        )}
                      >
                        <h3 className="text-foreground font-display text-[26px] leading-[30px] font-normal tracking-[-1.1px]">
                          {value.title}
                        </h3>
                        <p
                          className={cn(
                            "text-muted-foreground mt-[10px] max-w-[300px] font-sans text-[15px] leading-[24px] md:max-w-[260px] lg:max-w-[300px]",
                            isLeft && "md:ml-auto",
                          )}
                        >
                          {value.body}
                        </p>
                      </div>
                      {/* Empty counterweight so each row keeps its half. */}
                      <div
                        aria-hidden
                        className={cn("hidden md:block md:w-1/2", !isLeft && "md:order-1")}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 6 — Closing line */}
        <p className="text-muted-foreground mx-auto mt-[96px] max-w-[620px] text-center font-sans text-[17px] leading-[28px] md:mt-[140px]">
          Sketch to Design was built in the open, chapter by chapter, and the parts that
          were hard are written up on the <Hl>blog</Hl> — why a labelled box beats a better
          prompt, why a palette is a set of constraints, and what it takes to stream a
          design into existence without it flickering.
        </p>
      </div>
    </section>
  );
}
