import type { Metadata } from 'next'

import { CtaSection } from '@/components/marketing/home/CtaSection'
import { JsonLd } from '@/components/marketing/JsonLd'
import { FAQ_ENTRIES } from '@/lib/marketing-faq'

/**
 * Title and description, and a canonical that resolves itself.
 *
 * No `openGraph` block, which is the house rule rather than an omission: a
 * child's openGraph *replaces* the parent's object instead of merging into it,
 * so declaring one here to set a single key would drop og:site_name and
 * og:type from the page. /try shipped exactly that bug. The root layout
 * resolves og:url from the pathname, so this page gets its own for free.
 *
 * `alternates.canonical` is likewise inherited as "./" from the root and is
 * restated here only because it is the one tag this page exists to get right.
 */
export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Common questions about SketchMason — how a sketch becomes a finished design, what you can try without an account, and what comes out at the end.',
  alternates: { canonical: './' },
}

/**
 * FAQPage structured data, built from the same array the page renders.
 *
 * Two lists would drift, and the failure is silent and one-directional: the
 * page would show the current answer while the markup fed an old one to every
 * machine reading it. Questions whose answers are not settled are not in
 * FAQ_ENTRIES at all — see PENDING_CONFIRMATION — so nothing unconfirmed can
 * reach this block.
 */
const faqPage = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ENTRIES.map((entry) => ({
    '@type': 'Question',
    name: entry.question,
    acceptedAnswer: { '@type': 'Answer', text: entry.answer },
  })),
}

/**
 * Server-rendered and always open — no accordion.
 *
 * The home page's FAQ is a click-to-open client component, which is right for
 * a section someone is scrolling past. This page is the destination, and its
 * whole job is that the answers are in the HTML: an answer behind a button is
 * still in the DOM, but a page whose text is visible without interaction is
 * the one worth linking to and the easier one to read on a phone.
 */
export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqPage} />
      <section className="section-pad">
        <div className="container-home">
          <div className="mx-auto max-w-[640px] text-center">
            <span className="eyebrow">FAQ</span>
            <h1 className="font-display text-[clamp(2.1rem,4vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-muted-foreground">
              Questions, <span className="text-foreground">answered.</span>
            </h1>
          </div>

          <dl className="mx-auto mt-10 w-full max-w-[760px] space-y-3">
            {FAQ_ENTRIES.map((entry) => (
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
        </div>
      </section>
      <CtaSection />
    </>
  )
}
