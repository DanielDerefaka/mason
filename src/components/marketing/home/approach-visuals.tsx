"use client";

import { useSyncExternalStore } from "react";

import {
  ACCENTS,
  DOT_GRID,
  DesignScreen,
  PHONE_SKETCH,
  PhoneDesign,
  PhoneFrame,
  SketchScreen,
} from "@/components/marketing/screen-mocks";
import { CMS_ROWS } from "@/lib/marketing-content";
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
 * 1 — Mood Board First: the palette and type a board is read down into
 * ------------------------------------------------------------------ */

/** Each card is one token from a style guide, named the way the app names them. */
const SWATCHES: { name: string; hex: string; role: string }[] = [
  { name: "Primary", hex: "#2563EB", role: "Buttons, links" },
  { name: "Accent", hex: "#7C5CFF", role: "Highlights" },
  { name: "Surface", hex: "#111114", role: "Cards, sheets" },
  { name: "Foreground", hex: "#F4F4F5", role: "Body text" },
  { name: "Success", hex: "#1FA97B", role: "Confirmations" },
  { name: "Warning", hex: "#D4A62A", role: "Cautions" },
];

function SwatchRow({ animation, from }: { animation: string; from: number }) {
  const cards = Array.from(
    { length: 6 },
    (_, i) => SWATCHES[(from + i) % SWATCHES.length],
  );

  return (
    <div className="overflow-hidden">
      <div className="flex w-max" style={{ animation }}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {cards.map((card, i) => (
              <div
                key={`${copy}-${i}`}
                className="border-hairline bg-surface mr-[12px] flex h-[190px] w-[280px] shrink-0 flex-col justify-between overflow-hidden rounded-[8px] border p-[16px]"
              >
                <span
                  className="block h-[86px] w-full rounded-[6px]"
                  style={{
                    background: `linear-gradient(150deg, ${card.hex} 0%, rgba(255,255,255,0.08) 130%)`,
                  }}
                />
                <span>
                  <span className="text-foreground block font-sans text-[14px] leading-[18px]">
                    {card.name}
                  </span>
                  <span className="text-muted-foreground mt-[2px] flex items-center justify-between font-sans text-[12px] leading-[16px]">
                    <span>{card.role}</span>
                    <span className="tabular-nums">{card.hex}</span>
                  </span>
                </span>
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
      <SwatchRow from={0} animation="marquee-x 35s linear infinite" />
      <div className="h-[12px] shrink-0" />
      <SwatchRow from={3} animation="marquee-x-reverse 45s linear infinite" />
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ *
 * 2 — Sketch The Screen: the same phone, drawn then built
 * ------------------------------------------------------------------ */

export function PhonesVisual() {
  return (
    <VisualFrame
      style={{
        background:
          "radial-gradient(60% 50% at 50% 75%, rgba(37,99,235,0.55) 0%, transparent 70%)",
      }}
    >
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
        {/* Left phone — the sketch, sitting lower. */}
        <PhoneFrame className="h-[260px] w-[130px] md:h-[360px] md:w-[180px]">
          <SketchScreen boxes={PHONE_SKETCH} />
        </PhoneFrame>

        {/* Right phone — what it became, overlapping and ~30px higher. */}
        <PhoneFrame className="-ml-[30px] mb-[30px] h-[260px] w-[130px] md:h-[360px] md:w-[180px]">
          <PhoneDesign accent={ACCENTS[1]} />
        </PhoneFrame>
      </div>
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ *
 * 3 — Watch It Build: a design part-written, with the streaming edge
 * ------------------------------------------------------------------ */

export function DashboardVisual() {
  return (
    <VisualFrame>
      <div className="border-hairline absolute bottom-0 left-[24px] right-0 top-[24px] overflow-hidden rounded-tl-[10px] border-l border-t md:left-[32px]">
        <DesignScreen accent={ACCENTS[0]} />

        {/* The part not written yet, and the caret at the boundary. */}
        <div
          className="bg-surface absolute inset-x-0 bottom-0 h-[38%]"
          style={DOT_GRID}
        />
        <span
          className="absolute left-0 right-0 h-[2px]"
          style={{
            bottom: "38%",
            background:
              "linear-gradient(90deg, transparent, rgba(37,99,235,0.9) 20%, rgba(37,99,235,0.9) 80%, transparent)",
          }}
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
 * 4 — Revise By Asking: the design with the chat open over it
 * ------------------------------------------------------------------ */

const CHAT = [
  { from: "user", text: "Make the hero image full width" },
  { from: "app", text: "Updated the hero. Nothing else moved." },
  { from: "user", text: "Warmer accent on the cards" },
];

export function EditorVisual() {
  return (
    <VisualFrame>
      <div className="border-hairline absolute bottom-0 left-1/2 h-[calc(100%-24px)] w-[92%] -translate-x-1/2 overflow-hidden rounded-[10px_10px_0_0] border-x border-t">
        <DesignScreen accent={ACCENTS[2]} />
      </div>

      {/* Chat panel, floating over the bottom-right of the design. */}
      <div className="border-hairline bg-surface absolute bottom-[18px] right-[8%] w-[62%] max-w-[300px] overflow-hidden rounded-[10px] border p-[10px] shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col gap-[6px]">
          {CHAT.map((line) => (
            <span
              key={line.text}
              className={cn(
                "max-w-[86%] rounded-[8px] px-[9px] py-[6px] font-sans text-[11px] leading-[15px]",
                line.from === "user"
                  ? "self-end bg-[#2563EB] text-white"
                  : "bg-surface-2 text-muted-foreground self-start",
              )}
            >
              {line.text}
            </span>
          ))}
        </div>
      </div>
    </VisualFrame>
  );
}

/* ------------------------------------------------------------------ *
 * 5 — Seamless CMS Launch: vertically looping CMS table
 * ------------------------------------------------------------------ */

const CMS_GRID = "grid grid-cols-[1fr_56px_44px] items-center gap-[12px]";

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
          <span className="whitespace-nowrap text-right tabular-nums">{row.date}</span>
          <span
            className="ml-auto block h-[24px] w-[36px] rounded-[4px]"
            style={{
              background: `linear-gradient(150deg, ${ACCENTS[i % ACCENTS.length]} 0%, rgba(255,255,255,0.10) 100%)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function CmsTableVisual() {
  return (
    <VisualFrame>
      {/* Canvas grid behind the panel. */}
      <div className="absolute inset-0" style={DOT_GRID} />

      <div className="bg-surface relative mx-[24px] flex h-full flex-col overflow-hidden rounded-[12px] md:mx-[32px]">
        {/* Header. */}
        <div
          className={cn(
            CMS_GRID,
            "border-hairline text-muted-foreground shrink-0 border-b px-[20px] py-[16px] font-sans text-[14px] leading-[22px]",
          )}
        >
          <span>Page</span>
          <span className="text-right">Time</span>
          <span className="text-right">Look</span>
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
