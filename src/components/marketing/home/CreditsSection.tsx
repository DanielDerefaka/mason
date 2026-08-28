import Link from "next/link";

import { CREDITS } from "@/lib/marketing-content";

/**
 * What a credit buys, laid out like a pricing block: the argument on the
 * left, the ledger on the right. Plan prices deliberately do not appear —
 * they live in the app, read from the billing config, so this page can never
 * drift out of step with what is actually charged.
 *
 * Static, so a server component.
 */
export function CreditsSection() {
  return (
    <section className="section-pad">
      <div className="container-home reveal">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-14">
          <div>
            <span className="eyebrow">{CREDITS.eyebrow}</span>
            <h2 className="font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-muted-foreground">
              {CREDITS.headline.lead}{" "}
              <span className="text-foreground">{CREDITS.headline.emphasis}</span>
            </h2>
            <blockquote className="mt-6 border-l-2 border-white/[0.16] pl-5 text-[1.05rem] leading-relaxed text-muted-foreground">
              {CREDITS.quote}
            </blockquote>
            <Link href={CREDITS.cta.href} className="pill pill-primary mt-8">
              {CREDITS.cta.label} <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-surface">
            {CREDITS.rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-6 border-b border-hairline px-6 py-5 last:border-b-0"
              >
                <span className="text-[1rem] text-foreground">{row.label}</span>
                {/* "Free" gets a badge so the one row that costs nothing stands apart from the ones that do. */}
                <span
                  className={
                    row.value === "Free"
                      ? "rounded-full border border-white/[0.14] bg-white/[0.06] px-3 py-1 text-[0.8rem] font-medium text-foreground"
                      : "text-[0.95rem] text-muted-foreground"
                  }
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
