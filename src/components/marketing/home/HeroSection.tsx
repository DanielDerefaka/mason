import Image from "next/image";
import Link from "next/link";
import { Fragment, type SVGProps } from "react";

import { HERO, HERO_CANVAS_TILES } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Local mockup glyphs — tiny, stroke-only icons that only ever appear
 * inside the hero's editor mockup, so they stay local to this file.
 * ------------------------------------------------------------------ */

type GlyphProps = SVGProps<SVGSVGElement>;

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
  focusable: false,
} as const;

function ChevronLeftGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="m14 6-6 6 6 6" />
    </svg>
  );
}

function ChevronDownGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Desktop / monitor — the selected device in the segmented control. */
function MonitorGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M9 20h6M12 17v3" />
    </svg>
  );
}

/** Mobile / phone — the unselected device in the segmented control. */
function PhoneGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </svg>
  );
}

function HouseGlyph(props: GlyphProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" />
    </svg>
  );
}

/** The 4-square grid that marks every layer row. */
function GridGlyph(props: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable={false}
      {...props}
    >
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

/** The alignment strip along the top of the right-hand inspector. */
const ALIGN_GLYPHS: { key: string; bar: string; block: string }[] = [
  { key: "align-left", bar: "M4 3v18", block: "M7 8h9M7 16h5" },
  { key: "align-center-x", bar: "M12 3v18", block: "M7.5 8h9M9.5 16h5" },
  { key: "align-right", bar: "M20 3v18", block: "M8 8h9M12 16h5" },
  { key: "align-top", bar: "M3 4h18", block: "M8 7v9M16 7v5" },
  { key: "align-center-y", bar: "M3 12h18", block: "M8 7.5v9M16 9.5v5" },
  { key: "align-bottom", bar: "M3 20h18", block: "M8 8v9M16 12v5" },
];

function AlignGlyph({ bar, block, ...props }: GlyphProps & { bar: string; block: string }) {
  return (
    <svg {...stroke} {...props}>
      <path d={bar} />
      <path d={block} />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Mockup content
 * ------------------------------------------------------------------ */

const SIDEBAR_TABS = ["Pages", "Layers", "Assets"] as const;

const SIDEBAR_LAYERS = [
  "Hero",
  "Tech Stack",
  "Introduction",
  "Featured Works",
  "Services",
  "Approach",
  "FAQs",
  "CTA",
  "Footer",
] as const;

const SIZE_ROWS: { label: string; value: string; mode: string }[] = [
  { label: "Width", value: "1fr", mode: "Fill" },
  { label: "Height", value: "Auto", mode: "Fit" },
  { label: "Max Width", value: "1200", mode: "Fixed" },
];

/** Toolbar chip — 11px, muted, surface-2 fill. */
const toolbarChip =
  "inline-flex items-center gap-[3px] rounded-[6px] bg-surface-2 px-[8px] py-[4px] text-[11px] leading-none text-muted-foreground";

/** Inspector value chip — 11px, foreground, surface-2 fill. */
const valueChip =
  "inline-flex items-center gap-[3px] rounded-[6px] bg-surface-2 px-[8px] py-[5px] text-[11px] leading-none text-foreground";

/* ------------------------------------------------------------------ *
 * HeroSection
 * ------------------------------------------------------------------ */

export function HeroSection() {
  const [lineOne, lineTwo] = [HERO.headline.slice(0, 2), HERO.headline.slice(2)];
  const canvasTiles = [...HERO_CANVAS_TILES, ...HERO_CANVAS_TILES];

  return (
    <section id="hero" className="relative overflow-hidden">
      {/* Blue orb — sits behind everything, overflowing both edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[300px] z-0 -translate-x-1/2 md:top-[360px] lg:top-[419px]"
      >
        <Image
          src={HERO.orb}
          alt=""
          width={1890}
          height={1260}
          priority
          className="h-auto w-[150vw] max-w-none lg:w-[110vw] lg:max-w-[1890px]"
        />
      </div>

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

      {/* Editor mockup */}
      <div className="relative z-10 mt-[60px] px-[24px] md:px-[48px]">
        <div className="mx-auto flex h-[640px] w-full max-w-[1190px] flex-col overflow-hidden rounded-[12px] border border-hairline bg-surface">
          {/* 1 — Top toolbar */}
          <div className="flex h-[52px] shrink-0 items-center gap-[12px] border-b border-hairline px-[12px]">
            <div className="flex flex-1 items-center gap-[10px]">
              <Image
                src="/images/s2c-canvas.png"
                alt=""
                width={18}
                height={18}
                className="h-[18px] w-[18px] shrink-0 object-contain"
              />
              <ChevronLeftGlyph className="h-[14px] w-[14px] text-muted-foreground" />
            </div>

            <div className="flex items-center gap-[8px]">
              <div className="flex items-center gap-[2px] rounded-[6px] bg-surface-2 p-[2px]">
                <span className="flex h-[22px] w-[26px] items-center justify-center rounded-[5px] bg-accent text-foreground">
                  <MonitorGlyph className="h-[13px] w-[13px]" />
                </span>
                <span className="flex h-[22px] w-[26px] items-center justify-center rounded-[5px] text-muted-foreground">
                  <PhoneGlyph className="h-[13px] w-[13px]" />
                </span>
              </div>

              <span className={toolbarChip}>w 1710px</span>
              <span className={toolbarChip}>
                100%
                <ChevronDownGlyph className="h-[10px] w-[10px]" />
              </span>
            </div>

            <div className="flex flex-1 items-center justify-end">
              <div className="flex items-center">
                <span className="h-[22px] w-[22px] rounded-full border border-surface bg-surface-2" />
                <span className="-ml-[8px] h-[22px] w-[22px] rounded-full border border-surface bg-muted" />
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            {/* 2 — Left sidebar */}
            <aside className="hidden w-[215px] shrink-0 flex-col border-r border-hairline p-[10px] md:flex">
              <div className="flex items-center gap-[4px]">
                {SIDEBAR_TABS.map((tab) => (
                  <span
                    key={tab}
                    className={cn(
                      "rounded-[6px] px-[8px] py-[5px] text-[11px] leading-none",
                      tab === "Layers"
                        ? "bg-surface-2 text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {tab}
                  </span>
                ))}
              </div>

              <div className="mt-[12px] flex items-center gap-[8px] rounded-[6px] px-[10px] py-[6px] text-[12px] leading-none text-foreground">
                <HouseGlyph className="h-[12px] w-[12px] shrink-0" />
                <span className="flex-1 text-left">Home</span>
                <ChevronDownGlyph className="h-[12px] w-[12px] shrink-0 text-muted-foreground" />
              </div>

              <div className="mt-[2px] flex flex-col gap-[2px] pl-[12px]">
                {SIDEBAR_LAYERS.map((layer) => (
                  <span
                    key={layer}
                    className={cn(
                      "flex items-center gap-[8px] rounded-[6px] px-[10px] py-[6px] text-[12px] leading-none",
                      layer === "Hero"
                        ? "bg-[#2563EB] text-white"
                        : "text-muted-foreground"
                    )}
                  >
                    <GridGlyph className="h-[10px] w-[10px] shrink-0 opacity-70" />
                    {layer}
                  </span>
                ))}
              </div>
            </aside>

            {/* 4 — Canvas: two counter-drifting screenshot marquees */}
            <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-[12px] overflow-hidden">
              <div
                className="flex w-max shrink-0"
                style={{ animation: "marquee-x 40s linear infinite" }}
              >
                {canvasTiles.map((src, i) => (
                  <Image
                    loading="eager"
                    key={`row1-${i}`}
                    src={src}
                    alt=""
                    width={200}
                    height={352}
                    className="mr-[12px] h-[352px] w-[200px] shrink-0 rounded-[8px] object-cover"
                  />
                ))}
              </div>

              <div
                className="flex w-max shrink-0"
                style={{ animation: "marquee-x-reverse 52s linear infinite" }}
              >
                {canvasTiles.map((src, i) => (
                  <Image
                    loading="eager"
                    key={`row2-${i}`}
                    src={src}
                    alt=""
                    width={200}
                    height={352}
                    className="mr-[12px] h-[352px] w-[200px] shrink-0 rounded-[8px] object-cover"
                  />
                ))}
              </div>
            </div>

            {/* 3 — Right inspector */}
            <aside className="hidden w-[215px] shrink-0 flex-col gap-[16px] border-l border-hairline p-[12px] md:flex">
              <div className="flex items-center gap-[6px] text-muted-foreground">
                {ALIGN_GLYPHS.map((g) => (
                  <AlignGlyph key={g.key} bar={g.bar} block={g.block} className="h-[13px] w-[13px]" />
                ))}
              </div>

              <div>
                <h3 className="text-[12px] font-semibold leading-none text-foreground">Position</h3>
                <div className="mt-[10px] flex items-center justify-between gap-[6px]">
                  <span className="text-[11px] leading-none text-muted-foreground">Type</span>
                  <span className={valueChip}>Relative</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold leading-none text-foreground">Size</h3>
                  <span className="text-[12px] leading-none text-muted-foreground">+</span>
                </div>

                <div className="mt-[10px] flex flex-col gap-[8px]">
                  {SIZE_ROWS.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-[6px]">
                      <span className="shrink-0 text-[11px] leading-none text-muted-foreground">
                        {row.label}
                      </span>
                      <span className="flex items-center gap-[6px]">
                        <span className={valueChip}>{row.value}</span>
                        <span className={valueChip}>
                          {row.mode}
                          <ChevronDownGlyph className="h-[10px] w-[10px]" />
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
