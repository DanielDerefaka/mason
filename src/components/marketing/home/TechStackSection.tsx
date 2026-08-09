import Image from "next/image";

import { TECH_STACK_LOGOS, TECH_STACK_STRIP } from "@/lib/marketing-content";

/**
 * Static logo lockup that sits between the hero and the introduction.
 *
 * The reference ships the first row (Wix Studio / Stripe / Figma / Blender) as a
 * single pre-composed 640x97 raster; only that asset was recoverable, so the
 * second row (Unicorn / Notion / Adobe / Analytics) is rebuilt as text
 * wordmarks tuned to match its weight and rhythm.
 *
 * The `id` is load-bearing: SiteHeader's IntersectionObserver watches it.
 */
export function TechStackSection() {
  const secondRow = TECH_STACK_LOGOS.slice(4);

  return (
    <section id="tech-stack" className="py-[60px]">
      <div className="container-site">
        <div className="flex flex-col items-center gap-[40px]">
          {/* Row 1 — pre-composed strip. */}
          <Image
            src={TECH_STACK_STRIP}
            alt="Wix Studio, Stripe, Figma and Blender"
            width={640}
            height={97}
            priority={false}
            style={{ height: "auto" }}
            className="w-[640px] max-w-full"
          />

          {/* Row 2 — text wordmarks. */}
          <div className="flex flex-wrap items-center justify-center gap-x-[28px] gap-y-[16px] md:flex-nowrap md:gap-x-[40px] lg:gap-x-[56px]">
            {secondRow.map((logo) => (
              <span
                key={logo}
                className="text-foreground font-sans text-[18px] font-bold tracking-[-0.5px] opacity-90 md:text-[22px]"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
