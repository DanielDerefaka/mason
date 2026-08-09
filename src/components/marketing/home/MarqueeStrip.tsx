import { MARQUEE_ITEMS } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

/**
 * Full-bleed, time-driven service ticker. Deliberately NOT wrapped in
 * `.container-site` — it spans the whole viewport.
 *
 * Pure CSS: the track holds two copies of the list and translates -50%
 * (global `marquee-x` keyframes), so the loop is seamless with no JS.
 */
function MarqueeGroup({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {MARQUEE_ITEMS.map((item) => (
        <span key={item} className="flex shrink-0 items-center">
          <span className="text-foreground font-sans opacity-90">{item}</span>
          <span
            aria-hidden
            className="text-muted-foreground mx-[18px] md:mx-[28px]"
          >
            &bull;
          </span>
        </span>
      ))}
    </div>
  );
}

export function MarqueeStrip() {
  return (
    <section
      className={cn(
        "bg-surface w-full overflow-hidden",
        "h-[56px] text-[16px] leading-[56px]",
        "md:h-[69px] md:text-[20px] md:leading-[69px]"
      )}
      aria-label="Services"
    >
      <div className="edge-fade-x h-full overflow-hidden">
        <div
          className="flex h-full w-max shrink-0 items-center whitespace-nowrap"
          style={{ animation: "marquee-x 28s linear infinite" }}
        >
          <MarqueeGroup />
          <MarqueeGroup ariaHidden />
        </div>
      </div>
    </section>
  );
}
