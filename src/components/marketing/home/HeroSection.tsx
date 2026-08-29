import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Monitor } from "lucide-react";

import { HERO } from "@/lib/marketing-content";
import { ctaHref } from "@/lib/try/free-week";

/**
 * HeroSection
 *
 * Measured from the reference: a 1320px measure (wider than the 1120px the
 * rest of the page uses), one line of headline, six checklist lines in two
 * columns of three, one small link — and no buttons. The header carries
 * "Start free"; putting two more pills here made the copy block tall enough
 * to push the product below the fold, and the product is the argument.
 *
 * The capture below the headline is a real screenshot of the app, not a CSS
 * drawing of it: the inspiration board with a reference in it, an empty
 * frame, and beside them a landing page the model actually generated. One
 * image, no cycling mockup — the reference rotates screens here, but Mason
 * has a single honest one and it does the job on its own.
 *
 * Server component on purpose: nothing here needs state, and the hero is the
 * first paint of the site, so it should ship as HTML.
 */
export function HeroSection() {
  // During the free week /auth/* redirects to the canvas, so the secondary
  // pill would be a link that bounces. It reads the switch directly because
  // this is a server component; `/` redirects to /try that week anyway, which
  // makes this belt and braces rather than a path anyone walks.
  const signUpHref = ctaHref();

  return (
    <section
      id="hero"
      className="relative overflow-x-clip px-5 pt-[clamp(80px,12vh,128px)] pb-[clamp(2.5rem,5vw,4rem)] md:px-8"
    >
      <div className="relative mx-auto w-full max-w-[1320px]">
        {/* Copy block — left-aligned: eyebrow, headline, checklist, one link. */}
        <div className="reveal">
          <p className="mb-5 text-[0.82rem] font-medium tracking-[-0.01em] text-white/[0.42]">
            {HERO.eyebrow}
          </p>

          {/* Grey, white, grey: the emphasis sits in the middle of one
              flowing line rather than at the end of a wrapped one. */}
          <h1 className="font-display mb-7 max-w-[1320px] text-balance text-[clamp(2.2rem,4vw,3.75rem)] leading-[1.05] font-medium tracking-tight text-muted-foreground">
            {HERO.headline.lead} <span className="text-foreground">{HERO.headline.emphasis}</span>{" "}
            {HERO.headline.tail}
          </h1>

          {/* Column-major: items one to three fill the left column, four to
              six the right, so the list reads down before it reads across. */}
          <ul className="mb-6 flex max-w-[620px] flex-col gap-2 text-[clamp(0.94rem,1.45vw,1.12rem)] leading-snug text-muted-foreground lg:grid lg:max-w-[1040px] lg:grid-flow-col lg:grid-rows-3 lg:gap-x-8">
            {HERO.checklist.map((item) => (
              <li key={item.lead} className="flex items-start gap-2.5">
                <span className="flex h-[1.375em] shrink-0 items-center">
                  <Check className="h-4 w-4 text-foreground" strokeWidth={2.5} />
                </span>
                <span className="text-balance">
                  <span className="text-foreground">{item.lead}</span>
                  {item.rest}
                </span>
              </li>
            ))}
          </ul>

          {/* The two pills share the row the desktop link already occupied,
              rather than taking a block of their own. That is what keeps the
              note above true: a third row here is what pushed the capture
              below the fold last time. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-4 sm:pb-0.5">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={HERO.cta.primary.href}
                className="pill pill-primary !px-6 !py-2.5 !text-[0.9rem]"
              >
                {HERO.cta.primary.label}
              </Link>
              <Link
                href={signUpHref}
                className="pill pill-secondary !px-6 !py-2.5 !text-[0.9rem]"
              >
                {HERO.cta.secondary.label}
              </Link>
            </div>

            <Link
              href={HERO.aside.href}
              className="group inline-flex items-center gap-2 whitespace-nowrap text-[0.84rem] font-medium tracking-tight text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <Monitor className="h-4 w-4 text-faint" strokeWidth={2} />
              <span className="text-faint">{HERO.aside.kicker}</span>
              <span className="text-foreground">{HERO.aside.label}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Product capture. The glow pools beneath the frame rather than
            behind the copy, so the frame reads as lit from below. The frame
            deliberately has no `reveal`: it is the largest thing on first
            paint, and starting it at opacity 0 until the observer runs handed
            the LCP to images further down the page. */}
        <div className="relative mt-[clamp(3.25rem,7vw,6rem)]">
          <div
            aria-hidden
            className="hero-glow pointer-events-none absolute -inset-x-[8%] -bottom-[12%] h-[72%] blur-2xl"
          />
          <div className="glass-frame relative">
            <Image
              src={HERO.image.src}
              alt={HERO.image.alt}
              width={2400}
              height={1374}
              priority
              sizes="(max-width: 1384px) calc(100vw - 64px), 1320px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
