import type { Metadata } from 'next'

import { CtaSection } from '@/components/marketing/home/CtaSection'
import { LEGAL_UPDATED, TERMS_DESCRIPTION, TERMS_SECTIONS } from '@/lib/marketing-legal'

export const metadata: Metadata = {
  title: 'Terms',
  description: TERMS_DESCRIPTION,
}

export default function TermsPage() {
  return (
    <>
      <article className="section-pad">
        <div className="container-home">
          <div className="mx-auto max-w-[680px]">
            <span className="eyebrow">Terms</span>
            <h1 className="font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-foreground">
              Terms of use
            </h1>
            <p className="mt-4 text-[0.9rem] text-muted-foreground">Updated {LEGAL_UPDATED}.</p>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-muted-foreground">
              {TERMS_DESCRIPTION}
            </p>

            {TERMS_SECTIONS.map((section) => (
              <section key={section.heading} className="mt-10">
                <h2 className="font-display text-[1.35rem] font-medium tracking-[-0.02em] text-foreground">
                  {section.heading}
                </h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </article>
      <CtaSection />
    </>
  )
}
