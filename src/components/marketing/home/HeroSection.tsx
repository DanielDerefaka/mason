import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import { HERO } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

/**
 * HeroSection
 *
 * The mockup below the headline used to be a CSS drawing of the editor. It is
 * now a real capture of the app: the inspiration board with a reference in it,
 * an empty frame, and beside them a landing page the model actually generated.
 * A drawing could only ever claim that; the capture shows it.
 */
export function HeroSection() {
  const [lineOne, lineTwo] = [HERO.headline.slice(0, 2), HERO.headline.slice(2)];

  return (
    <section id="hero" className="relative overflow-hidden">
      {/* Glow — a gradient, not an image, so nothing can overlap the buttons. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[240px] z-0 h-[760px] w-[150vw] max-w-none -translate-x-1/2 md:top-[300px] lg:top-[340px] lg:w-[110vw]"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(37,99,235,0.30) 0%, rgba(37,99,235,0.08) 45%, transparent 72%)",
        }}
      />

      {/* Headline block */}
      <div className="container-site relative z-10 flex flex-col items-center pt-[110px] text-center md:pt-[130px] lg:pt-[150px]">
        <span className="flex h-[27px] w-[156px] items-center justify-center rounded-[17px] font-display text-[18px] leading-[18px] tracking-[-0.9px] text-foreground">
          {HERO.eyebrow}
        </span>

        <h1 className="mt-[24px] font-display text-[40px] font-normal leading-[42px] tracking-[-2px] text-foreground md:text-[64px] md:leading-[64px] md:tracking-[-3.8px] lg:text-[92px] lg:leading-[92px] lg:tracking-[-5.52px]">
          {[lineOne, lineTwo].map((line, lineIndex) => (
            <span key={lineIndex} className="block">
              {line.map((word, wordIndex) => (
                <Fragment key={word.text}>
                  {wordIndex > 0 && " "}
                  <span className={cn(word.italic && "font-display-italic")}>{word.text}</span>
                </Fragment>
              ))}
            </span>
          ))}
        </h1>

        <p className="mt-[28px] font-sans text-[16px] leading-[24px] text-muted-foreground md:text-[20px] lg:text-[24px] lg:leading-[24px]">
          {HERO.subhead}
        </p>

        <div className="mt-[32px] flex items-center justify-center gap-[12px]">
          <Link href={HERO.primaryCta.href} className="pill pill-primary">
            {HERO.primaryCta.label}
          </Link>
          <Link href={HERO.secondaryCta.href} className="pill pill-secondary">
            {HERO.secondaryCta.label}
          </Link>
        </div>
      </div>

      {/* Product capture */}
      <div className="relative z-10 mt-[60px] px-[24px] md:px-[48px]">
        <div className="border-hairline bg-surface mx-auto w-full max-w-[1190px] overflow-hidden rounded-[12px] border shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
          <Image
            src={HERO.image.src}
            alt={HERO.image.alt}
            width={2400}
            height={1374}
            priority
            sizes="(max-width: 750px) calc(100vw - 48px), (max-width: 1286px) calc(100vw - 96px), 1190px"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
