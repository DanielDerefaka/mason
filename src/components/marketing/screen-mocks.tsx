import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Screen mocks
 *
 * Everything the marketing site used to show as a screenshot is drawn
 * here instead, in CSS. Two reasons: a screenshot of this app scaled
 * into a slot shaped for studio photography never sat right, and a
 * drawing cannot go stale when the product's chrome changes.
 *
 * The vocabulary is deliberately small — a sketch is grey and dashed,
 * a design is filled and accented — because the whole story the page
 * tells is the step between those two states.
 * ------------------------------------------------------------------ */

/** The dotted canvas backdrop, matching the real editor's grid. */
export const DOT_GRID = {
  backgroundImage: "radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)",
  backgroundSize: "14px 14px",
} as const;

/* ------------------------------------------------------------------ *
 * Sketch side
 * ------------------------------------------------------------------ */

type Box = {
  /** Percentages of the parent, so a sketch scales with its slot. */
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  /** Circles read as avatars/badges in a wireframe. */
  round?: boolean;
};

/** The wireframe a user would actually draw for a landing page. */
export const SKETCH_LAYOUT: Box[] = [
  { x: 8, y: 7, w: 22, h: 5, label: "Logo" },
  { x: 58, y: 7, w: 34, h: 5, label: "Nav" },
  { x: 8, y: 20, w: 50, h: 9, label: "Headline" },
  { x: 8, y: 32, w: 38, h: 4 },
  { x: 8, y: 38, w: 30, h: 4 },
  { x: 8, y: 47, w: 18, h: 6, label: "CTA" },
  { x: 62, y: 20, w: 30, h: 33, label: "Image" },
  { x: 8, y: 62, w: 26, h: 24, label: "Card" },
  { x: 37, y: 62, w: 26, h: 24, label: "Card" },
  { x: 66, y: 62, w: 26, h: 24, label: "Card" },
];

/**
 * A hand-drawn wireframe: dashed grey rectangles with the labels that make
 * a sketch legible to the model. Nothing here is interactive — it is the
 * "before" half of the story.
 */
export function SketchScreen({
  boxes = SKETCH_LAYOUT,
  className,
  showLabels = true,
}: {
  boxes?: Box[];
  className?: string;
  showLabels?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={DOT_GRID}
    >
      {boxes.map((box, i) => (
        <div
          key={i}
          className={cn(
            "absolute flex items-center justify-center border border-dashed",
            box.round ? "rounded-full" : "rounded-[4px]",
          )}
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.w}%`,
            height: `${box.h}%`,
            borderColor: "rgba(255,255,255,0.34)",
            backgroundColor: "rgba(255,255,255,0.045)",
          }}
        >
          {showLabels && box.label ? (
            <span
              className="truncate px-[4px] font-sans text-[9px] leading-none tracking-[0.02em] md:text-[10px]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {box.label}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Design side
 * ------------------------------------------------------------------ */

/** Accents the generated screens cycle through, so a row of them reads as
 *  one design system rather than a set of unrelated mocks. */
export const ACCENTS = ["#2563EB", "#7C5CFF", "#E86A4B", "#1FA97B", "#D4A62A"] as const;

/**
 * The "after" half: the same layout as `SKETCH_LAYOUT`, filled in. Blocks
 * that were dashed outlines become type, imagery and a real button.
 */
export function DesignScreen({
  accent = ACCENTS[0],
  className,
  dense = false,
}: {
  accent?: string;
  className?: string;
  /** Drops the card row — used in narrow tiles where it would crowd. */
  dense?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative h-full w-full overflow-hidden bg-[#0B0B0C]",
        className,
      )}
    >
      {/* Nav */}
      <div className="flex items-center justify-between px-[7%] pt-[6%]">
        <span
          className="block h-[5px] w-[26%] rounded-full"
          style={{ backgroundColor: accent }}
        />
        <span className="flex gap-[5px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-[4px] w-[14px] rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.28)" }}
            />
          ))}
        </span>
      </div>

      {/* Headline + hero image */}
      <div className="mt-[7%] flex items-start gap-[5%] px-[7%]">
        <div className="flex-1">
          <span className="block h-[9px] w-[92%] rounded-[3px] bg-white/90" />
          <span className="mt-[6px] block h-[9px] w-[64%] rounded-[3px] bg-white/90" />
          <span className="mt-[11px] block h-[4px] w-[86%] rounded-full bg-white/25" />
          <span className="mt-[5px] block h-[4px] w-[70%] rounded-full bg-white/25" />
          <span
            className="mt-[12px] block h-[13px] w-[46%] rounded-full"
            style={{ backgroundColor: accent }}
          />
        </div>

        <div
          className="h-[76px] w-[36%] shrink-0 rounded-[6px]"
          style={{
            background: `linear-gradient(150deg, ${accent} 0%, rgba(255,255,255,0.10) 100%)`,
          }}
        />
      </div>

      {/* Card row */}
      {dense ? null : (
        <div className="mt-[8%] flex gap-[3.5%] px-[7%]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-1 rounded-[6px] border border-white/10 bg-white/[0.045] p-[8px]"
            >
              <span
                className="block h-[16px] w-full rounded-[3px]"
                style={{ backgroundColor: `${accent}38` }}
              />
              <span className="mt-[7px] block h-[3px] w-[80%] rounded-full bg-white/30" />
              <span className="mt-[4px] block h-[3px] w-[55%] rounded-full bg-white/18" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Devices
 * ------------------------------------------------------------------ */

/** A phone-shaped bezel. Pass either half of the story as its contents. */
export function PhoneFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[22px] border border-white/15 bg-[#0B0B0C] p-[5px] shadow-[0_18px_50px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      <div className="h-full w-full overflow-hidden rounded-[17px]">{children}</div>
      <span className="absolute left-1/2 top-[9px] h-[3px] w-[34px] -translate-x-1/2 rounded-full bg-white/25" />
    </div>
  );
}

/** The single-column layout a phone sketch would carry. */
export const PHONE_SKETCH: Box[] = [
  { x: 10, y: 5, w: 34, h: 4, label: "Logo" },
  { x: 10, y: 14, w: 80, h: 24, label: "Hero" },
  { x: 10, y: 42, w: 62, h: 4 },
  { x: 10, y: 49, w: 46, h: 4 },
  { x: 10, y: 58, w: 44, h: 6, label: "CTA" },
  { x: 10, y: 71, w: 80, h: 11, label: "Card" },
  { x: 10, y: 85, w: 80, h: 11, label: "Card" },
];

/** The phone equivalent of `DesignScreen` — same system, one column. */
export function PhoneDesign({ accent = ACCENTS[1] }: { accent?: string }) {
  return (
    <div aria-hidden className="h-full w-full bg-[#0B0B0C] px-[10%] pt-[12%]">
      <span
        className="block h-[4px] w-[40%] rounded-full"
        style={{ backgroundColor: accent }}
      />
      <div
        className="mt-[10%] h-[26%] w-full rounded-[8px]"
        style={{
          background: `linear-gradient(150deg, ${accent} 0%, rgba(255,255,255,0.10) 100%)`,
        }}
      />
      <span className="mt-[9%] block h-[7px] w-[88%] rounded-[3px] bg-white/90" />
      <span className="mt-[5px] block h-[7px] w-[60%] rounded-[3px] bg-white/90" />
      <span
        className="mt-[9%] block h-[12px] w-[54%] rounded-full"
        style={{ backgroundColor: accent }}
      />
      {[0, 1].map((i) => (
        <div
          key={i}
          className="mt-[7%] flex items-center gap-[8px] rounded-[6px] border border-white/10 bg-white/[0.045] p-[7px]"
        >
          <span
            className="block h-[18px] w-[18px] shrink-0 rounded-[4px]"
            style={{ backgroundColor: `${accent}45` }}
          />
          <span className="flex-1">
            <span className="block h-[3px] w-[80%] rounded-full bg-white/30" />
            <span className="mt-[4px] block h-[3px] w-[50%] rounded-full bg-white/18" />
          </span>
        </div>
      ))}
    </div>
  );
}
