"use client";

import { useCallback, useState } from "react";

import { ChevronDownIcon } from "@/components/marketing/icons";
import { FAQS } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

/**
 * Click-driven, MULTI-OPEN accordion — any number of rows can sit open at
 * once, so open state is a Set of indices rather than one index.
 *
 * Panel height is animated with the `grid-template-rows: 0fr -> 1fr` trick so
 * the transition is smooth without measuring scrollHeight.
 *
 * The `id` is load-bearing: SiteHeader's IntersectionObserver watches it.
 */
export function FaqSection() {
  const [openRows, setOpenRows] = useState<Set<number>>(() => new Set());

  const toggle = useCallback((index: number) => {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return (
    <section id="faqs" className="section-pad">
      <div className="container-home reveal">
        <div className="mx-auto max-w-[640px] text-center">
          <span className="eyebrow">FAQ</span>
          <h2 className="font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-muted-foreground">
            Questions, <span className="text-foreground">answered.</span>
          </h2>
        </div>

        <div className="mx-auto mt-10 w-full max-w-[760px] space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openRows.has(index);
            const panelId = `faq-panel-${index}`;
            const triggerId = `faq-trigger-${index}`;
            // The content numbers its questions ("1. ...") but the glass rows
            // carry no numbering, so the prefix is stripped at render.
            const question = faq.question.replace(/^\d+\.\s*/, "");

            return (
              <div key={faq.question} className="card-surface">
                <button
                  type="button"
                  id={triggerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(index)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-display text-[1.05rem] font-medium tracking-[-0.02em] text-foreground">
                    {question}
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-[350ms] ease-in-out",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-[350ms] ease-in-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p
                      className="px-6 pb-5 text-[0.95rem] leading-relaxed text-muted-foreground"
                      aria-hidden={!isOpen}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
