"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";

import { CMS_ROWS, PLATFORM, PROJECTS } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Shared
 * ------------------------------------------------------------------ */

/**
 * Every visual is absolutely-free inside the card's remaining height and is
 * clipped by the card itself. `VisualFrame` just supplies the positioning
 * context so each visual can anchor its own contents.
 */
function VisualFrame({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 1 — Discovery First: two opposed screenshot marquees
 * ------------------------------------------------------------------ */

/** One duplicated row. The gap lives on each tile (`mr`) so the -50% loop
 *  lands exactly on the seam — flex `gap` would leave it half a gap short. */
function MarqueeRow({
  tiles,
  animation,
}: {
  tiles: (typeof PROJECTS)[number][];
  animation: string;
}) {
  return (
    <div className="overflow-hidden">
      <div className="flex w-max" style={{ animation }}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {tiles.map((tile) => (
              <div
                key={`${copy}-${tile.slug}`}
                className="relative mr-[12px] h-[190px] w-[280px] shrink-0 overflow-hidden rounded-[8px]"
              >
                <Image
                  loading="eager"
                  src={tile.image}
                  alt={tile.name}
                  fill
                  sizes="280px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiscoveryMarqueeVisual() {
  return (
    <VisualFrame className="flex flex-col justify-center">
      <MarqueeRow
        tiles={PROJECTS.slice(0, 6)}
        animation="marquee-x 35s linear infinite"
      />
      <div className="h-[12px] shrink-0" />
      <MarqueeRow
        tiles={PROJECTS.slice(6, 12)}
        animation="marquee-x-reverse 45s linear infinite"
      />
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ *
 * 2 — Mobile-First Design: two phone mockups on a blue glow
 * ------------------------------------------------------------------ */

const PHONES = [
  { src: "/images/s2c-colours.png", alt: "ShowIn mobile layout" },
  { src: "/images/s2c-workflow.png", alt: "Health Core mobile layout" },
];

export function PhonesVisual() {
  return (
    <VisualFrame
      style={{
        background:
          "radial-gradient(60% 50% at 50% 75%, rgba(37,99,235,0.55) 0%, transparent 70%)",
      }}
    >
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
        {/* Left phone — sits lower. */}
        <div className="relative h-[260px] w-[130px] shrink-0 overflow-hidden rounded-[22px] md:h-[360px] md:w-[180px]">
          <Image
            src={PHONES[0].src}
            alt={PHONES[0].alt}
            fill
            sizes="(max-width: 750px) 130px, 180px"
            className="object-cover"
          />
        </div>

        {/* Right phone — overlaps the left and rides ~30px higher. */}
        <div className="relative -ml-[30px] mb-[30px] h-[260px] w-[130px] shrink-0 overflow-hidden rounded-[22px] md:h-[360px] md:w-[180px]">
          <Image
            src={PHONES[1].src}
            alt={PHONES[1].alt}
            fill
            sizes="(max-width: 750px) 130px, 180px"
            className="object-cover"
          />
        </div>
      </div>
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ *
 * 3 — Conversion-Driven: dashboard screenshot + blue sweep
 * ------------------------------------------------------------------ */

export function DashboardVisual() {
  return (
    <VisualFrame>
      <div className="absolute bottom-0 left-[24px] right-0 top-[24px] overflow-hidden rounded-tl-[10px] rounded-bl-[10px] md:left-[32px]">
        <Image
          src="/images/s2c-dashboard.png"
          alt="Analytics dashboard"
          fill
          sizes="(max-width: 750px) 90vw, 45vw"
          className="rounded-[10px] object-cover object-left-top"
        />
      </div>

      {/* Blue sweep across the card's top-right corner. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(215deg, rgba(37,99,235,0.9) 0%, rgba(37,99,235,0) 55%)",
        }}
      />
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ *
 * 4 — Pixel-Perfect Development: editor screenshot
 * ------------------------------------------------------------------ */

export function EditorVisual() {
  return (
    <VisualFrame>
      <div className="absolute bottom-0 left-1/2 h-[calc(100%-24px)] w-[92%] -translate-x-1/2 overflow-hidden rounded-[10px_10px_0_0]">
        <Image
          src="/images/s2c-canvas.png"
          alt="Website editor interface"
          fill
          sizes="(max-width: 750px) 92vw, 46vw"
          className="object-cover object-top"
        />
      </div>
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ *
 * 5 — Seamless CMS Launch: vertically looping CMS table
 * ------------------------------------------------------------------ */

const CMS_GRID = "grid grid-cols-[1fr_92px_44px] items-center gap-[12px]";

function CmsRows({ copy }: { copy: number }) {
  return (
    <div>
      {CMS_ROWS.map((row, i) => (
        <div
          key={`${copy}-${row.title}`}
          className={cn(
            CMS_GRID,
            "border-hairline text-foreground border-b px-[20px] py-[14px] font-sans text-[14px] leading-[22px]",
          )}
        >
          <span className="truncate">{row.title}</span>
          <span className="whitespace-nowrap">{row.date}</span>
          <span className="relative block h-[24px] w-[36px] overflow-hidden rounded-[4px]">
            <Image
              src={PROJECTS[i % PROJECTS.length].image}
              alt=""
              fill
              sizes="36px"
              className="object-cover"
            />
          </span>
        </div>
      ))}
    </div>
  );
}

export function CmsTableVisual() {
  return (
    <VisualFrame>
      {/* Soft photographic backdrop behind the panel. */}
      <Image
        src={PLATFORM.background}
        alt=""
        fill
        sizes="(max-width: 750px) 100vw, 50vw"
        className="object-cover opacity-[0.35]"
      />

      <div className="bg-surface relative mx-[24px] flex h-full flex-col overflow-hidden rounded-[12px] md:mx-[32px]">
        {/* Header. */}
        <div
          className={cn(
            CMS_GRID,
            "border-hairline text-muted-foreground shrink-0 border-b px-[20px] py-[16px] font-sans text-[14px] leading-[22px]",
          )}
        >
          <span>Title</span>
          <span>Date</span>
          <span>Image</span>
        </div>

        {/* Body — two copies translated -50% for a seamless vertical loop. */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div style={{ animation: "marquee-y 26s linear infinite" }}>
            <CmsRows copy={0} />
            <CmsRows copy={1} />
          </div>
        </div>
      </div>
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ *
 * 6 — Future-Ready: a real, live 24-hour analog clock
 * ------------------------------------------------------------------ */

/** 24 positions, 15° apart. Evens carry a label, odds a thick tick. */
const TICKS = Array.from({ length: 24 }, (_, i) => {
  const hour = i + 1; // 1..24, with 24 sitting at the top of the dial.
  return {
    hour,
    angle: (hour % 24) * 15,
    label: hour % 2 === 0 ? String(hour).padStart(2, "0") : null,
  };
});

/* --- The 1s tick, as an external store. -----------------------------------
 *
 * `useSyncExternalStore` (rather than useState + useEffect) is what keeps this
 * hydration-safe AND lint-clean: the server snapshot is `null`, so nothing
 * time-dependent is ever prerendered, and the clock only starts reading real
 * time once React subscribes on the client.
 */
let currentTime: Date | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
const tickListeners = new Set<() => void>();

function subscribeToClock(onStoreChange: () => void) {
  tickListeners.add(onStoreChange);

  if (ticker === null) {
    currentTime = new Date();
    ticker = setInterval(() => {
      currentTime = new Date();
      tickListeners.forEach((listener) => listener());
    }, 1000);
  }

  return () => {
    tickListeners.delete(onStoreChange);
    if (tickListeners.size === 0 && ticker !== null) {
      clearInterval(ticker);
      ticker = null;
      currentTime = null;
    }
  };
}

const getClockSnapshot = () => currentTime;
const getClockServerSnapshot = (): Date | null => null;

/* --- prefers-reduced-motion, likewise as an external store. --------------- */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onStoreChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

const getMotionSnapshot = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
/** Assume reduced on the server — the hands aren't drawn there anyway. */
const getMotionServerSnapshot = () => true;

export function ClockVisual() {
  const now = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getClockServerSnapshot,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    getMotionSnapshot,
    getMotionServerSnapshot,
  );

  const seconds = now ? now.getSeconds() : 0;
  const minutes = now ? now.getMinutes() + seconds / 60 : 0;
  // 24-hour dial: a full revolution takes a whole day, so 15° per hour.
  const hours = now ? (now.getHours() + minutes / 60) * 15 : 0;

  const handTransition = reducedMotion ? "none" : "transform 120ms ease-out";

  return (
    <VisualFrame className="flex items-center justify-center">
      <div className="scale-[0.769] md:scale-100">
        <div
          className="relative h-[260px] w-[260px] rounded-[9999px]"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, #2a2a2a 0%, #0d0d0d 70%)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
          role="img"
          aria-label={
            now
              ? `Current time ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`
              : "Clock"
          }
        >
          {/* Dial — every child is rotated about the face centre so labels
              and ticks sit radially. */}
          {TICKS.map((tick) => (
            <div
              key={tick.hour}
              className="absolute inset-0"
              style={{ transform: `rotate(${tick.angle}deg)` }}
            >
              {tick.label ? (
                <span
                  className="absolute left-1/2 top-[10px] -translate-x-1/2 font-sans text-[10px] leading-none"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {tick.label}
                </span>
              ) : (
                <span
                  className="absolute left-1/2 top-[10px] h-[9px] w-[2px] -translate-x-1/2 rounded-[1px]"
                  style={{ backgroundColor: "rgba(255,255,255,0.85)" }}
                />
              )}
            </div>
          ))}

          {/* Hands — only drawn once mounted. */}
          {now ? (
            <>
              <span
                className="absolute bottom-1/2 left-1/2 h-[62px] w-[4px] rounded-[2px]"
                style={{
                  backgroundColor: "#ffffff",
                  transformOrigin: "bottom center",
                  transform: `translateX(-50%) rotate(${hours}deg)`,
                  transition: handTransition,
                }}
              />
              <span
                className="absolute bottom-1/2 left-1/2 h-[88px] w-[3px] rounded-[2px]"
                style={{
                  backgroundColor: "#ffffff",
                  transformOrigin: "bottom center",
                  transform: `translateX(-50%) rotate(${minutes * 6}deg)`,
                  transition: handTransition,
                }}
              />
              <span
                className="absolute bottom-1/2 left-1/2 h-[100px] w-[1px]"
                style={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  transformOrigin: "bottom center",
                  transform: `translateX(-50%) rotate(${seconds * 6}deg)`,
                  transition: handTransition,
                }}
              />
            </>
          ) : null}

          {/* Centre pin. */}
          <span
            className="absolute left-1/2 top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0 0 0 3px rgba(0,0,0,0.6)",
            }}
          />
        </div>
      </div>
    </VisualFrame>
  );
}
