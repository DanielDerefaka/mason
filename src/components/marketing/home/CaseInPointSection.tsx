import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

import { CASE_IN_POINT } from "@/lib/marketing-content";

/**
 * The two-column case study: copy and a checklist on the left, the two real
 * generated captures stacked in a glass card on the right. These captures are
 * the only place the site shows output rather than describing it, which is
 * why they get a section of their own rather than a slot in the feature run.
 *
 * Static markup throughout, so it stays a server component.
 */
export function CaseInPointSection() {
  const { eyebrow, headline, body, points, cta, images } = CASE_IN_POINT;

  return (
    <section className="section-pad relative overflow-hidden">
      {/* A faint wash behind the whole section so it reads as a pause between
          the feature run and what follows, without a hard panel edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.025)_50%,transparent)]"
      />

      <div className="container-home reveal relative">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <span className="eyebrow">{eyebrow}</span>

            <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08] font-medium tracking-[-0.03em] text-muted-foreground">
              {headline.lead}{" "}
              <span className="text-foreground">{headline.emphasis}</span>
            </h2>

            <p className="mt-5 text-[1.05rem] leading-relaxed text-muted-foreground">
              {body}
            </p>

            <ul className="mt-6 space-y-2.5">
              {points.map((point) => (
                <li key={point.lead} className="flex gap-3 text-[1rem] leading-snug">
                  <Check
                    className="mt-[3px] h-4 w-4 shrink-0 text-foreground"
                    strokeWidth={2.5}
                  />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{point.lead}</span>
                    {point.rest}
                  </span>
                </li>
              ))}
            </ul>

            <Link href={cta.href} className="pill pill-primary mt-8">
              {cta.label} <span aria-hidden>→</span>
            </Link>
          </div>

          {/* The captures stack like the reference's stacked rows: the full
              page on top, the close crop beneath it. */}
          <div className="card-surface p-3 sm:p-4">
            <div className="glass-frame">
              <Image
                src={images.page.src}
                alt={images.page.alt}
                width={images.page.width}
                height={images.page.height}
                sizes="(max-width: 1024px) calc(100vw - 48px), 540px"
                className="h-auto w-full"
              />
            </div>

            <div className="glass-frame mt-3 sm:mt-4">
              <Image
                src={images.detail.src}
                alt={images.detail.alt}
                width={images.detail.width}
                height={images.detail.height}
                sizes="(max-width: 1024px) calc(100vw - 48px), 540px"
                className="h-auto w-full"
              />
            </div>

            <p className="mt-3 px-1 text-[0.78rem] text-faint">
              Generated from a six-rectangle sketch and two reference images.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
