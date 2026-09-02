import type { Metadata } from 'next'
import Link from 'next/link'

import { CtaSection } from '@/components/marketing/home/CtaSection'
import { JsonLd } from '@/components/marketing/JsonLd'
import {
  COMPARE_DESCRIPTION,
  COMPARE_FAQ,
  COMPARE_LEAD,
  COMPARE_ROWS,
} from '@/lib/marketing-compare'
import { breadcrumbs, webPage } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: { absolute: 'SketchMason vs Uizard, Google Stitch and v0' },
  description: COMPARE_DESCRIPTION,
}

const faqPage = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: COMPARE_FAQ.map((entry) => ({
    '@type': 'Question',
    name: entry.question,
    acceptedAnswer: { '@type': 'Answer', text: entry.answer },
  })),
}

export default function ComparePage() {
  return (
    <>
      <JsonLd data={faqPage} />
      <JsonLd
        data={webPage(
          'SketchMason compared with Uizard, Google Stitch and v0',
          '/compare',
          COMPARE_DESCRIPTION,
        )}
      />
      <JsonLd data={breadcrumbs([{ name: 'Compare', path: '/compare' }])} />
      <section className="section-pad">
        <div className="container-home">
          <div className="mx-auto max-w-[680px] text-center">
            <span className="eyebrow">Compare</span>
            <h1 className="font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-muted-foreground">
              SketchMason compared with Uizard, Google Stitch and v0.
            </h1>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-muted-foreground">{COMPARE_LEAD}</p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[0.9rem]">
              <thead>
                <tr className="border-b border-hairline text-[0.75rem] uppercase tracking-[0.06em] text-faint">
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Starts from</th>
                  <th className="px-4 py-3 font-medium">You get</th>
                  <th className="px-4 py-3 font-medium">Best when</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.tool} className="border-b border-hairline align-top">
                    <th className="px-4 py-4 font-medium text-foreground">{row.tool}</th>
                    <td className="px-4 py-4 text-muted-foreground">{row.startsFrom}</td>
                    <td className="px-4 py-4 text-muted-foreground">{row.youGet}</td>
                    <td className="px-4 py-4 text-muted-foreground">{row.fit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mx-auto mt-14 max-w-[760px] space-y-3">
            {COMPARE_FAQ.map((entry) => (
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

          {/* The two pages this one is the short version of. /compare had a
              single outbound link, to /try, so the long-form post that makes
              the same argument and the page that explains the input were both
              a search away from a reader already on the subject. */}
          <p className="mx-auto mt-10 max-w-[760px] text-center text-[0.95rem] leading-relaxed text-muted-foreground">
            For the longer version, read{' '}
            <Link href="/blog/sketchmason-and-uizard" className="text-foreground underline underline-offset-4 hover:no-underline">
              Uizard scans a sketch. SketchMason uses one as a spec.
            </Link>{' '}
            If you are starting from a drawing, the{' '}
            <Link href="/sketch-to-ui" className="text-foreground underline underline-offset-4 hover:no-underline">
              sketch to UI page
            </Link>{' '}
            walks through what to label.
          </p>

          <p className="mx-auto mt-6 max-w-[640px] text-center text-[0.95rem] text-muted-foreground">
            Draw a labelled sketch and see the difference.{' '}
            <Link href="/try" className="text-foreground underline-offset-4 hover:underline">
              Try it free, no sign-up
            </Link>
            .
          </p>
        </div>
      </section>
      <CtaSection />
    </>
  )
}
