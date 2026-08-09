import {
  ClockVisual,
  CmsTableVisual,
  DashboardVisual,
  DiscoveryMarqueeVisual,
  EditorVisual,
  PhonesVisual,
} from "./approach-visuals";
import { APPROACH } from "@/lib/marketing-content";
import type { ApproachStep } from "@/types/marketing-content";

/**
 * Maps the mock-data `visual` key onto its component.
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
 * The six-card "Our Approach" grid — the densest section on the page.
 *
 * The cards themselves are static markup, so this stays a server component;
 * the client boundary lives entirely in `approach-visuals.tsx`, which owns the
 * two marquees and the live analog clock.
 *
 * The `id` is load-bearing: SiteHeader's IntersectionObserver watches it to
 * drive the active nav state.
 */
export function ApproachSection() {
  return (
    <section id="approach" className="pt-[60px] pb-[60px] md:pt-[100px] md:pb-[100px]">
      <div className="container-site">
        <h2 className="text-foreground font-display mb-[44px] text-[30px] leading-[32px] font-normal tracking-[-1.2px] md:text-[42px] md:leading-[44px] md:tracking-[-2px] lg:text-[56px] lg:leading-[56px] lg:tracking-[-2.8px]">
          Our Approach
        </h2>

        <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2">
          {APPROACH.map((step) => {
            const Visual = VISUALS[step.visual];

            return (
              <article
                key={step.title}
                className="card-surface flex h-[420px] flex-col overflow-hidden md:h-[460px] lg:h-[540px]"
              >
                <h3 className="text-foreground font-display px-[24px] pt-[24px] text-[22px] leading-[26px] font-normal tracking-[-0.9px] md:px-[32px] md:pt-[32px] md:text-[26px] md:leading-[30px] md:tracking-[-1.1px] lg:text-[30px] lg:leading-[34px] lg:tracking-[-1.3px]">
                  {step.title}
                </h3>

                <p className="text-muted-foreground max-w-[560px] px-[24px] pt-[14px] font-sans text-[15px] leading-[22px] md:px-[32px] md:text-[16px] md:leading-[24px]">
                  {step.body.map((run, i) => (
                    <span
                      key={`${step.title}-${i}`}
                      className={run.bold ? "text-foreground font-semibold" : undefined}
                    >
                      {run.text}
                    </span>
                  ))}
                </p>

                {/* Visual fills whatever height is left and is clipped by the card. */}
                <div className="mt-auto min-h-0 w-full flex-1 overflow-hidden">
                  <Visual />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
