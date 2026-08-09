import Link from "next/link";

import { CTA } from "@/lib/marketing-content";

/**
 * Closing call-to-action — two display lines over a secondary/primary pill pair.
 * The secondary ("See our work") deliberately comes first, as on the reference.
 *
 * The `id` is load-bearing: SiteHeader's IntersectionObserver watches it.
 */
export function CtaSection() {
  const [lineOne, lineTwo] = CTA.headline;

  return (
    <section id="cta" className="py-[80px] md:py-[110px] lg:py-[140px]">
      <div className="container-site">
        <div className="flex flex-col items-center">
          <h2 className="text-foreground font-display text-center text-[34px] leading-[36px] font-normal tracking-[-1.6px] md:text-[56px] md:leading-[56px] md:tracking-[-2.8px] lg:text-[76px] lg:leading-[76px] lg:tracking-[-3.8px]">
            <span className="block">{lineOne}</span>
            <span className="block">{lineTwo}</span>
          </h2>

          <div className="mt-[40px] flex flex-row items-center justify-center gap-[10px]">
            <Link href={CTA.secondaryCta.href} className="pill pill-secondary">
              {CTA.secondaryCta.label}
            </Link>
            <Link href={CTA.primaryCta.href} className="pill pill-primary">
              {CTA.primaryCta.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
