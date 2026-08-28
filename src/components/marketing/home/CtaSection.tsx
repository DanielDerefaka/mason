import Link from "next/link";

import { CTA } from "@/lib/marketing-content";

/**
 * Closing call-to-action — a centred grey/white heading, one line of body,
 * one primary pill. Nothing else competes with the button.
 *
 * The `id` is load-bearing: SiteHeader's IntersectionObserver watches it.
 */
export function CtaSection() {
  return (
    <section id="cta" className="py-[clamp(6rem,12vw,9rem)]">
      <div className="container-home reveal">
        <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
          <h2 className="font-display text-[clamp(2.2rem,4.6vw,3.4rem)] leading-[1.05] font-medium tracking-[-0.035em] text-muted-foreground">
            {CTA.headline.lead}{" "}
            <span className="text-foreground">{CTA.headline.emphasis}</span>
          </h2>
          <p className="mt-5 text-[1.05rem] leading-relaxed text-muted-foreground">{CTA.body}</p>
          <Link href={CTA.primaryCta.href} className="pill pill-primary mt-8">
            {CTA.primaryCta.label} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
