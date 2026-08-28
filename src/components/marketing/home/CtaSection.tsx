import Link from "next/link";

import { CTA } from "@/lib/marketing-content";
import { ctaHref, isFreeWeek } from "@/lib/try/free-week";

/**
 * Closing call-to-action — a centred grey/white heading, one line of body,
 * one primary pill. Nothing else competes with the button.
 *
 * The `id` is load-bearing: SiteHeader's IntersectionObserver watches it.
 *
 * During the free week the pill goes to /try like the header's, and says so:
 * this section closes every marketing page, so a visitor who read all the
 * way down /explore or /download would otherwise land on a sign-up wall the
 * header had just told them they did not need. Read on the server, where this
 * renders, so switching the week off is an environment change, not a rebuild.
 */
export function CtaSection() {
  const freeWeek = isFreeWeek();

  return (
    <section id="cta" className="py-[clamp(6rem,12vw,9rem)]">
      <div className="container-home reveal">
        <div className="mx-auto flex max-w-[720px] flex-col items-center text-center">
          <h2 className="font-display text-[clamp(2.2rem,4.6vw,3.4rem)] leading-[1.05] font-medium tracking-[-0.035em] text-muted-foreground">
            {CTA.headline.lead}{" "}
            <span className="text-foreground">{CTA.headline.emphasis}</span>
          </h2>
          <p className="mt-5 text-[1.05rem] leading-relaxed text-muted-foreground">{CTA.body}</p>
          <Link href={freeWeek ? ctaHref() : CTA.primaryCta.href} className="pill pill-primary mt-8">
            {freeWeek ? "Try free" : CTA.primaryCta.label} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
