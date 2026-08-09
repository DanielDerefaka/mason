import Image from "next/image";
import Link from "next/link";

import { PLATFORM, PLATFORM_LOGOS } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

/**
 * The platform band that sits directly under the services grid: a dark
 * image-backed copy panel beside a hairline-divided 4x2 logo grid.
 *
 * The left panel is always dark (it sits on a starfield raster), so literal
 * white text is correct there in both themes — it is the one place in the
 * codebase that hardcodes a colour.
 */
export function PlatformSection() {
  return (
    <section className="mt-[12px]">
      <div className="container-site">
        <div className="flex flex-col gap-[12px] md:flex-row">
          {/* Left — image-backed copy panel. */}
          <div className="relative overflow-hidden rounded-[16px] md:h-[254px] md:w-1/2 lg:w-[44%]">
            <Image
              src={PLATFORM.background}
              alt=""
              fill
              sizes="(max-width: 750px) 100vw, 44vw"
              className="absolute inset-0 object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 100%)",
              }}
            />

            <div className="relative z-10 p-[28px] md:p-[40px]">
              <h2 className="font-display text-[22px] leading-[26px] font-normal tracking-[-1.2px] text-[#FFFFFF] md:text-[28px] md:leading-[32px]">
                {PLATFORM.headline.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h2>

              <p className="mt-[14px] max-w-[420px] font-sans text-[15px] leading-[22px] text-[rgba(255,255,255,0.75)]">
                {PLATFORM.body.map((run) => (
                  <span
                    key={run.text}
                    className={run.bold ? "font-bold text-[#FFFFFF]" : undefined}
                  >
                    {run.text}
                  </span>
                ))}
              </p>

              <Link
                href={PLATFORM.cta.href}
                // This panel is always dark, so the pill is pinned light-on-dark
                // rather than following the theme tokens.
                className="pill mt-[20px] border-white/20 bg-white/10 text-white transition-colors duration-[400ms] hover:bg-white/20"
              >
                {PLATFORM.cta.label}
              </Link>
            </div>
          </div>

          {/* Right — logo grid. Cells are separated by hairlines, not gaps. */}
          <div className="border-hairline grid grid-cols-2 grid-rows-4 overflow-hidden rounded-[16px] border md:h-[254px] md:w-1/2 md:grid-cols-4 md:grid-rows-2 lg:w-[56%]">
            {PLATFORM_LOGOS.map((logo, i) => (
              <div
                key={logo.name}
                className={cn(
                  "border-hairline group flex min-h-[90px] items-center justify-center md:min-h-0",
                  // Vertical dividers: 2-up on mobile, 4-up from 751px.
                  i % 2 === 0 && "border-r",
                  i % 4 === 3 ? "md:border-r-0" : "md:border-r",
                  // Horizontal dividers: every row but the last.
                  i < 6 && "border-b",
                  i < 4 ? "md:border-b" : "md:border-b-0",
                )}
              >
                <Image
                  src={logo.image}
                  alt={logo.name}
                  width={52}
                  height={52}
                  className="h-auto w-[52px] object-contain opacity-[0.55] transition-opacity duration-[400ms] group-hover:opacity-100"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
