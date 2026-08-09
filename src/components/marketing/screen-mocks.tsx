import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Screen mocks
 *
 * Everything the marketing site used to show as a screenshot is drawn
 * here instead, in CSS. Two reasons: a screenshot of this app scaled
 * into a slot shaped for studio photography never sat right, and a
 * drawing cannot go stale when the product's chrome changes.
 *
 * What is drawn here is only ever *input*: a wireframe is a diagram of
 * something the user makes. Finished designs are shown as real captures
 * instead — a coloured block pretending to be a generated screen reads as
 * a skeleton loader, and claims a result it cannot show.
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
 * Accents
 * ------------------------------------------------------------------ */

/** Used by the flow table's swatch column. */
export const ACCENTS = ["#2563EB", "#7C5CFF", "#E86A4B", "#1FA97B", "#D4A62A"] as const;

/* ------------------------------------------------------------------ *
 * Devices
 * ------------------------------------------------------------------ */

/** A phone-shaped bezel around a wireframe. */
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
