import Link from "next/link";

import { INTRODUCTION } from "@/lib/marketing-content";

/**
 * A statement, not a showcase.
 *
 * This used to be a text column beside three drifting rows of mock screens.
 * The mocks were coloured blocks standing in for generated designs and read
 * as skeleton loaders, so they are gone; with nothing real to put in that
 * column, the section centres on the words instead of stretching to fill a
 * width it no longer needs.
 */
export function IntroductionSection() {
  return (
    <section id="introduction" className="relative overflow-hidden py-[110px] md:py-[160px]">
      <div className="container-site">
        <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
          <h2 className="text-foreground font-display text-[32px] leading-[36px] font-normal tracking-[-1.4px] md:text-[48px] md:leading-[52px] md:tracking-[-2.2px] lg:text-[58px] lg:leading-[62px] lg:tracking-[-2.8px]">
            {INTRODUCTION.headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>

          <p className="text-muted-foreground mt-[28px] max-w-[560px] font-sans text-[16px] leading-[26px] md:text-[18px] md:leading-[28px]">
            {INTRODUCTION.body}
          </p>

          <div className="mt-[36px] flex flex-row items-center gap-3">
            <Link href={INTRODUCTION.primaryCta.href} className="pill pill-primary">
              {INTRODUCTION.primaryCta.label}
            </Link>
            <Link href={INTRODUCTION.secondaryCta.href} className="pill pill-secondary">
              {INTRODUCTION.secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
