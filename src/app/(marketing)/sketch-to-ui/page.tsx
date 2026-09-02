import type { Metadata } from 'next'
import Link from 'next/link'

import { CtaSection } from '@/components/marketing/home/CtaSection'
import { JsonLd } from '@/components/marketing/JsonLd'
import {
  SKETCH_TO_UI_DESCRIPTION,
  SKETCH_TO_UI_FAQ,
  SKETCH_TO_UI_STEPS,
} from '@/lib/marketing-sketch-to-ui'
import { breadcrumbs, webPage } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Sketch to UI from a hand-drawn layout',
  description: SKETCH_TO_UI_DESCRIPTION,
}

const faqPage = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: SKETCH_TO_UI_FAQ.map((entry) => ({
    '@type': 'Question',
    name: entry.question,
    acceptedAnswer: { '@type': 'Answer', text: entry.answer },
  })),
}

export default function SketchToUiPage() {
  return (
    <>
      <JsonLd data={faqPage} />
      <JsonLd
        data={webPage('Sketch to UI', '/sketch-to-ui', SKETCH_TO_UI_DESCRIPTION)}
      />
      <JsonLd data={breadcrumbs([{ name: 'Sketch to UI', path: '/sketch-to-ui' }])} />
      <section className="section-pad">
        <div className="container-home">
          <div className="mx-auto max-w-[680px] text-center">
            <span className="eyebrow">Sketch to UI</span>
            <h1 className="font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-muted-foreground">
              A labelled sketch is an instruction.{' '}
              <span className="text-foreground">The screen it implies gets built.</span>
            </h1>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-muted-foreground">
              {SKETCH_TO_UI_DESCRIPTION}
            </p>
          </div>

          <ol className="mx-auto mt-12 max-w-[720px] space-y-3">
            {SKETCH_TO_UI_STEPS.map((step, index) => (
              <li key={step.title} className="card-surface px-6 py-5">
                <p className="text-[0.75rem] uppercase tracking-[0.08em] text-faint">
                  Step {index + 1}
                </p>
                <h2 className="mt-2 font-display text-[1.15rem] font-medium tracking-[-0.02em] text-foreground">
                  {step.title}
                </h2>
                <p className="mt-2.5 text-[0.9rem] leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>

          <dl className="mx-auto mt-14 max-w-[760px] space-y-3">
            {SKETCH_TO_UI_FAQ.map((entry) => (
              <div key={entry.question} className="card-surface px-6 py-5">
                <dt className="font-display text-[1.05rem] font-medium tracking-[-0.02em] text-foreground">
                  {entry.question}
                </dt>
                <dd className="mt-2.5 text-[0.9rem] leading-relaxed text-muted-foreground">
                  {entry.answer}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mx-auto mt-10 max-w-[640px] text-center text-[0.95rem] text-muted-foreground">
            <Link href="/try" className="text-foreground underline-offset-4 hover:underline">
              Try a labelled sketch on the canvas
            </Link>
            , read{' '}
            <Link
              href="/blog/how-a-labelled-sketch-becomes-a-ui"
              className="text-foreground underline-offset-4 hover:underline"
            >
              how a labelled sketch becomes a UI
            </Link>
            , or{' '}
            <Link href="/compare" className="text-foreground underline-offset-4 hover:underline">
              see how this differs from Uizard and v0
            </Link>
            .
          </p>
        </div>
      </section>
      <CtaSection />
    </>
  )
}
