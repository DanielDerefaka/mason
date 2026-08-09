import type { Metadata } from "next";

import { AboutContent } from "@/components/marketing/AboutContent";
import { CtaSection } from "@/components/marketing/home/CtaSection";

export const metadata: Metadata = {
  title: "About Us | Sketch to Design",
};

/**
 * /about-us — body sections plus the shared closing CTA.
 * Header and footer are supplied by the root layout.
 */
export default function AboutUsPage() {
  return (
    <>
      <AboutContent />
      <CtaSection />
    </>
  );
}
