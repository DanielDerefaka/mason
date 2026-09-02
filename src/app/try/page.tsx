import { Suspense } from 'react'

import { Canvas } from '@/components/canvas'
import { JsonLd } from '@/components/marketing/JsonLd'
import { TryShell } from '@/components/try/shell'
import { ORGANIZATION, POSITIONING } from '@/lib/brand'
import { SITE_URL } from '@/lib/site'
import { ORGANIZATION_ID, SOFTWARE_ID } from '@/lib/structured-data'
import { isFreeWeek } from '@/lib/try/free-week'

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

/**
 * The same node as the homepage's block, said again on the page a crawler is
 * most likely to land on. The `@id` is what makes it the same node: two
 * blocks with one name and two urls read as two products.
 */
const TRY_APPLICATION = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': SOFTWARE_ID,
  name: 'SketchMason',
  alternateName: 'Mason',
  url: `${SITE_URL}/try`,
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  description: POSITIONING,
  sameAs: ORGANIZATION.sameAs,
  publisher: { '@id': ORGANIZATION_ID },
}

export default function TryPage() {
  // Read here, on the server, and handed down: the shell is a client
  // component and the switch is not in its bundle. It decides only what the
  // exits from /try say, never whether the canvas opens.
  const freeWeek = isFreeWeek()

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
        <TryShell freeWeek={freeWeek}>
          <div className="relative flex-1">
            <Canvas />
          </div>
        </TryShell>
      </Suspense>
    </>
  )
}
