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

/** Maps the content `icon` key onto the matching glyph component. */
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
 * The capabilities grid: ten glass tiles, 3-up on desktop, 2-up on tablet,
 * stacked on mobile. Ten into three leaves one tile alone on the last row,
 * which is how the reference reads too — an orphan tile is calmer than a
 * stretched one.
 *
 * Static + hover only — the card lift is pure CSS, so this stays a server
 * component. The `id` is load-bearing: SiteHeader's IntersectionObserver
 * watches it to drive the active nav state.
 */
export function ServicesSection() {
  return (
    <section id="services" className="section-pad">
      <div className="container-home reveal">
        <div className="max-w-[640px]">
          <span className="eyebrow">{SERVICES_INTRO.eyebrow}</span>
          <h2 className="font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-muted-foreground">
            {SERVICES_INTRO.headline.lead}{" "}
            <span className="text-foreground">{SERVICES_INTRO.headline.emphasis}</span>
          </h2>
          <p className="mt-5 max-w-[560px] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-snug text-muted-foreground">
            {SERVICES_INTRO.body}
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = ICONS[service.icon];

            return (
              <article
                key={service.title}
                className="card-surface card-surface-hover flex flex-col px-6 py-6"
              >
                {/* The gradient fill lifts the disc a touch above the tile so the glyph reads as set on glass. */}
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-[linear-gradient(rgba(255,255,255,0.11),rgba(255,255,255,0.04))]">
                  <Icon className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="font-display mt-5 text-[1.15rem] font-medium tracking-[-0.035em] text-foreground">
                  {service.title}
                </h3>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={SERVICES_INTRO.primaryCta.href} className="pill pill-primary">
            {SERVICES_INTRO.primaryCta.label} <span aria-hidden>→</span>
          </Link>
          <Link href={SERVICES_INTRO.secondaryCta.href} className="pill pill-secondary">
            {SERVICES_INTRO.secondaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
