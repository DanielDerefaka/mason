import { Suspense } from 'react'

import { Canvas } from '@/components/canvas'
import { JsonLd } from '@/components/marketing/JsonLd'
import { TryShell } from '@/components/try/shell'
import { ORGANIZATION, POSITIONING } from '@/lib/brand'
import { SITE_URL } from '@/lib/site'

/**
 * Visible to a crawler that never runs the canvas. The page is a client
 * shell; without this block Google and answer engines fetched ~nothing and
 * still had to rank the URL the sitemap lists second.
 */
const CRAWLER_COPY = {
  title: 'Try SketchMason free',
  body: [
    POSITIONING,
    'Draw labelled rectangles on an infinite canvas, add a mood board, and generate the screen beside the sketch. No account needed. Export is HTML or a written brief.',
  ],
}

const TRY_APPLICATION = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SketchMason',
  alternateName: 'Mason',
  url: `${SITE_URL}/try`,
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  description: POSITIONING,
  sameAs: ORGANIZATION.sameAs,
}

export default function TryPage() {
  return (
    <>
      <JsonLd data={TRY_APPLICATION} />
      <section className="sr-only">
        <h1>{CRAWLER_COPY.title}</h1>
        {CRAWLER_COPY.body.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </section>
      <Suspense fallback={<div className="flex-1 bg-background" />}>
        <TryShell>
          <div className="relative flex-1">
            <Canvas />
          </div>
        </TryShell>
      </Suspense>
    </>
  )
}
