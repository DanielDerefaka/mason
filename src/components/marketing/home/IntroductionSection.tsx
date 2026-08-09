import Image from "next/image";
import Link from "next/link";

import { INTRODUCTION, PROJECTS } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/marketing-content";

/**
 * The marquee is split 9 / 8 / 8 across three rows. Row 3 is hidden on mobile.
 */
const ROWS: Project[][] = [
  PROJECTS.slice(0, 9),
  PROJECTS.slice(9, 17),
  PROJECTS.slice(17, 25),
];

/** Rendered tile footprint per breakpoint (aspect 349:620). */
const TILE_CLASS =
  "relative mr-4 h-[266px] w-[150px] shrink-0 overflow-hidden rounded-[10px] md:h-[338px] md:w-[190px] lg:h-[426px] lg:w-[240px]";

const TILE_SIZES = "(min-width: 1001px) 240px, (min-width: 751px) 190px, 150px";

function MarqueeRow({
  projects,
  animation,
  className,
}: {
  projects: Project[];
  animation: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex w-max shrink-0", className)}
      style={{ animation }}
      aria-hidden="true"
    >
      {/* The list is duplicated so the -50% translate loops seamlessly. */}
      {[0, 1].map((copy) => (
        <div key={copy} className="flex shrink-0">
          {projects.map((project) => (
            <div key={`${copy}-${project.slug}`} className={TILE_CLASS}>
              <Image
                loading="eager"
                src={project.image}
                alt={project.name}
                width={240}
                height={426}
                sizes={TILE_SIZES}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function IntroductionSection() {
  return (
    <section
      id="introduction"
      className="relative overflow-hidden py-20 md:h-[808px] md:py-0"
    >
      <div className="container-site h-full">
        <div className="relative flex h-full flex-col items-start md:flex-row md:items-center">
          {/* ---------------------------------------------------------- *
           * Left — heading, paragraph, buttons
           * ---------------------------------------------------------- */}
          <div className="w-full shrink-0 md:w-[45%] lg:w-[38%]">
            <h2 className="font-display text-[28px] leading-[32px] font-normal tracking-[-1.2px] text-foreground md:text-[34px] md:leading-[38px] md:tracking-[-1.5px] lg:text-[42px] lg:leading-[46px] lg:tracking-[-1.9px]">
              {INTRODUCTION.headline.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>

            <p className="mt-6 max-w-[400px] font-sans text-[15px] leading-[22px] text-muted-foreground md:text-[17px] md:leading-[24px]">
              {INTRODUCTION.body}
            </p>

            <div className="mt-8 flex flex-row items-center gap-3">
              <Link
                href={INTRODUCTION.primaryCta.href}
                className="pill pill-primary"
              >
                {INTRODUCTION.primaryCta.label}
              </Link>
              <Link
                href={INTRODUCTION.secondaryCta.href}
                className="pill pill-secondary"
              >
                {INTRODUCTION.secondaryCta.label}
              </Link>
            </div>
          </div>

          {/* ---------------------------------------------------------- *
           * Right — three-row image marquee, bleeding off the viewport.
           * Absolutely placed from tablet up so its (taller than the
           * section) stack is clipped symmetrically instead of pushing
           * the text column down.
           * ---------------------------------------------------------- */}
          <div className="edge-fade-x -ml-6 mt-12 flex w-screen flex-col gap-4 md:absolute md:top-1/2 md:left-[45%] md:mt-0 md:ml-0 md:-translate-y-1/2 lg:left-[38%]">
            <MarqueeRow
              projects={ROWS[0]}
              animation="marquee-x 55s linear infinite"
            />
            <MarqueeRow
              projects={ROWS[1]}
              animation="marquee-x-reverse 65s linear infinite"
            />
            <MarqueeRow
              projects={ROWS[2]}
              animation="marquee-x 55s linear infinite"
              className="hidden md:flex"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
