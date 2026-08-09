"use client";

import { useCallback, useState } from "react";

import { ChevronDownIcon } from "@/components/marketing/icons";
import { FAQS } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

/**
 * Click-driven, MULTI-OPEN accordion — the reference lets any number of rows
 * sit open at once, so open state is a Set of indices rather than one index.
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
    <section id="faqs" className="py-[80px] md:py-[110px] lg:py-[140px]">
      <div className="container-site">
        {/* Heading */}
        <h2 className="text-foreground font-display mb-[56px] text-center text-[30px] leading-[32px] font-normal tracking-[-1.2px] md:text-[46px] md:leading-[46px] md:tracking-[-2.2px] lg:text-[62px] lg:leading-[62px] lg:tracking-[-3.2px]">
          Frequently Asked <span className="font-display-italic">Questions</span>
        </h2>

        {/* Accordion */}
        <div className="mx-auto w-full max-w-[880px]">
          {FAQS.map((faq, index) => {
            const isOpen = openRows.has(index);
            const panelId = `faq-panel-${index}`;
            const triggerId = `faq-trigger-${index}`;

            return (
              <div
                key={faq.question}
                className={cn(
                  "border-hairline mb-[12px] rounded-[12px] border bg-transparent transition-[border-color] duration-[400ms] ease-out",
                  !isOpen && "hover:border-[var(--border)]",
                )}
              >
                <button
                  type="button"
                  id={triggerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(index)}
                  className="flex w-full cursor-pointer items-center justify-between gap-[16px] px-[18px] py-[16px] text-left md:px-[24px] md:py-[18px]"
                >
                  <span className="text-foreground font-sans text-[15px] leading-[22px] md:text-[16px] md:leading-[24px]">
                    {faq.question}
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "text-muted-foreground h-[18px] w-[18px] shrink-0 transition-transform duration-[350ms] ease-in-out",
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
                      className="text-muted-foreground font-sans text-[15px] leading-[24px] px-[18px] pb-[20px] md:px-[24px]"
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
