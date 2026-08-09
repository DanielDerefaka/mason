import Link from "next/link";
import type { SVGProps } from "react";

import {
  BoltIcon,
  CartIcon,
  EditSquareIcon,
  GlobeWwwIcon,
  NavigationIcon,
  PaperPlaneIcon,
  PuzzleIcon,
  RocketIcon,
  StackedBarsIcon,
  ToolsIcon,
} from "@/components/marketing/icons";
import { SERVICES, SERVICES_INTRO } from "@/lib/marketing-content";
import type { ServiceCard } from "@/types/marketing-content";

/** Maps the mock-data `icon` key onto the matching glyph component. */
const ICONS: Record<
  ServiceCard["icon"],
  (props: SVGProps<SVGSVGElement>) => React.JSX.Element
> = {
  globe: GlobeWwwIcon,
  edit: EditSquareIcon,
  cart: CartIcon,
  bars: StackedBarsIcon,
  plane: PaperPlaneIcon,
  puzzle: PuzzleIcon,
  bolt: BoltIcon,
  navigation: NavigationIcon,
  rocket: RocketIcon,
  tools: ToolsIcon,
};

/**
 * The ten-card services grid: 5x2 on desktop, 3-up on tablet, 2-up on mobile.
 *
 * Static + hover only — the card lift is pure CSS, so this stays a server
 * component. The `id` is load-bearing: SiteHeader's IntersectionObserver
 * watches it to drive the active nav state.
 */
export function ServicesSection() {
  return (
    <section id="services" className="pt-[60px] md:pt-[80px]">
      <div className="container-site">
        {/* Header row — stacks below 751px, otherwise heading left / buttons right. */}
        <div className="mb-[44px] flex flex-col items-start gap-[20px] md:flex-row md:items-end md:justify-between md:gap-[24px]">
          <h2 className="text-foreground font-display text-[30px] leading-[32px] font-normal tracking-[-1.2px] md:text-[42px] md:leading-[44px] md:tracking-[-2px] lg:text-[56px] lg:leading-[56px] lg:tracking-[-2.8px]">
            {SERVICES_INTRO.headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>

          <div className="flex items-center gap-[10px]">
            <Link href={SERVICES_INTRO.primaryCta.href} className="pill pill-primary">
              {SERVICES_INTRO.primaryCta.label}
            </Link>
            <Link href={SERVICES_INTRO.secondaryCta.href} className="pill pill-secondary">
              {SERVICES_INTRO.secondaryCta.label}
            </Link>
          </div>
        </div>

        {/* Card grid. */}
        <div className="grid grid-cols-2 gap-[12px] md:grid-cols-3 lg:grid-cols-5">
          {SERVICES.map((service) => {
            const Icon = ICONS[service.icon];

            return (
              <div
                key={service.lines.join(" ")}
                className="card-surface hover:border-border hover:bg-accent flex h-[180px] flex-col items-center justify-center px-[12px] transition-[border-color,background-color] duration-[400ms] md:h-[228px]"
              >
                <Icon className="text-foreground h-[28px] w-[28px] shrink-0" />
                <p className="text-muted-foreground mt-[18px] text-center font-sans text-[13px] leading-[17px] md:text-[15px] md:leading-[19px]">
                  {service.lines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
