import type { Metadata } from "next";

import { AboutContent } from "@/components/marketing/AboutContent";
import { CtaSection } from "@/components/marketing/home/CtaSection";
import { ABOUT_DEFINITION } from "@/lib/marketing-about";

// The description is the sentence the page opens with. It had none, so it
// inherited the site's — the line every blog post was also falling back to —
// and the one page meant to say what Mason is described it in the home page's
// words.
export const metadata: Metadata = {
  title: { absolute: 'About SketchMason' },
  description: ABOUT_DEFINITION,
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
