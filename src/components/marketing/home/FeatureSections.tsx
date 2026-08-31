import Link from "next/link";

import {
  ClockVisual,
  CmsTableVisual,
  DashboardVisual,
  DiscoveryMarqueeVisual,
  EditorVisual,
  PhonesVisual,
} from "./approach-visuals";
import { APPROACH } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";
import type { ApproachStep } from "@/types/marketing-content";

/**
 * Maps the content's `visual` key onto its component.
 *
 * This registry has to live HERE, not in `approach-visuals.tsx`: a plain
 * object exported from a `"use client"` module crosses the RSC boundary as a
 * client-reference proxy, so indexing it server-side yields `undefined` and
 * the prerender dies with "Element type is invalid".
 */
const VISUALS: Record<ApproachStep["visual"], () => React.JSX.Element> = {
  marquee: DiscoveryMarqueeVisual,
  phones: PhonesVisual,
  dashboard: DashboardVisual,
  editor: EditorVisual,
  "cms-table": CmsTableVisual,
  clock: ClockVisual,
};

/**
 * One alternating two-column feature per APPROACH step, replacing the old
 * six-card grid. The markup is static, so this stays a server component; the
 * client boundary lives entirely in `approach-visuals.tsx`.
 *
 * The outer `id` is load-bearing: SiteHeader's IntersectionObserver watches it
 * to drive the active nav state, so it sits on the single wrapping section
 * rather than on any of the six blocks.
 *
 * Each block gets its own, shorter, vertical padding rather than `section-pad`
 * so six of them in a row read as a sequence instead of a wall; only the first
 * carries the full section top so the run lines up with its neighbours.
 */
export function FeatureSections() {
  return (
    <section id="approach">
      {APPROACH.map((step, i) => {
        const Visual = VISUALS[step.visual];
        const flipped = i % 2 === 1;

        return (
          <div
            key={step.title}
            className={cn(
              "py-[clamp(3rem,7vw,5.5rem)]",
              i === 0 && "pt-[clamp(4.5rem,10vw,7rem)]",
            )}
          >
            <div className="container-home reveal">
              <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
                <div className={cn(flipped && "lg:order-2")}>
                  <span className="eyebrow">
                    {String(i + 1).padStart(2, "0")} · {step.title}
                  </span>

                  <h2 className="font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-muted-foreground">
                    {step.headline[0]}{" "}
                    <span className="text-foreground">{step.headline[1]}</span>
                  </h2>

                  <p className="mt-5 max-w-[560px] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-snug text-muted-foreground">
                    {step.body.map((run, j) => (
                      <span
                        key={`${step.title}-${j}`}
                        className={run.bold ? "font-medium text-foreground" : undefined}
                      >
                        {run.text}
                      </span>
                    ))}
                  </p>

                  <Link href="/try" className="pill pill-secondary mt-7">
                    Try it free <span aria-hidden>→</span>
                  </Link>
                </div>

                {/* The visuals were built to fill the bottom of a fixed-height
                    card and clip, so they get a fixed-height frame here too;
                    the absolute wrapper gives their `h-full` something to
                    measure against. */}
                <div className={cn(flipped && "lg:order-1")}>
                  <div className="glass-frame relative h-[320px] sm:h-[380px] lg:h-[440px]">
                    <div className="absolute inset-0">
                      <Visual />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
