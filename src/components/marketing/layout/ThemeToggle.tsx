"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

/**
 * The reference's pill switch: knob left + white in dark mode, knob right + amber in
 * light mode. Colour-only cross-fade, no layout shift.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label="Toggle colour theme"
      onClick={toggle}
      className={cn(
        "relative inline-flex h-[25px] w-[50px] shrink-0 items-center rounded-full border transition-colors duration-300",
        isLight
          ? "border-black/10 bg-black/10"
          : "border-white/15 bg-white/10",
        className
      )}
    >
      <span
        className={cn(
          "absolute h-[19px] w-[19px] rounded-full transition-all duration-300",
          isLight ? "left-[27px] bg-[#F4BF4F]" : "left-[3px] bg-white"
        )}
      />
    </button>
  );
}
