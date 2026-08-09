import { NextResponse, type NextRequest } from 'next/server'
import { streamText } from 'ai'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { anthropicProvider, MODEL } from '@/lib/anthropic'
import {
  CreditsBalanceQuery,
  InspirationImagesQuery,
  StyleGuideQuery,
} from '@/convex/query.config'
import { prompts } from '@/prompts'

export const runtime = 'nodejs'
export const maxDuration = 300

/** Turns the stored guide into the block of facts the model designs against. */
const describeStyleGuide = (
  guide: Awaited<ReturnType<typeof StyleGuideQuery>>,
  referenceCount: number,
) => {
  if (!guide) {
    // Without a guide the references are the only steer there is, so telling
    // the model to stay neutral here would quietly cancel them out.
    return referenceCount > 0
      ? 'No style guide has been generated for this project, so the CSS variables are unset — write literal colours instead, and take the palette from the reference images.'
      : 'No style guide has been generated for this project, so the CSS variables are unset — write literal colours instead. Choose a restrained, confident palette and a common sans-serif.'
  }

  const swatches = guide.colorSections
    .flatMap((section) => section.swatches)
    .map((swatch) => `  ${swatch.token}: ${swatch.color} — ${swatch.name}${swatch.description ? `. ${swatch.description}` : ''}`)
    .join('\n')

  return [
    `Theme: ${guide.theme} — ${guide.description}`,
    `Font family: ${guide.typography.fontFamily}`,
    `Weights available: ${guide.typography.styles.map((s) => s.weight).join(', ')}`,
    'Colours (already bound to the matching CSS variables):',
    swatches,
  ].join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const image = form.get('image')
    const projectId = form.get('projectId') as Id<'projects'> | null
    const frameLabel = (form.get('frameLabel') as string | null) ?? ''

    if (!(image instanceof File) || !image.type.startsWith('image/')) {
      return NextResponse.json({ message: 'A frame image is required' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 })
    }

    const { ok, balance } = await CreditsBalanceQuery()
    if (!ok) return NextResponse.json({ message: 'Could not read your credit balance' }, { status: 401 })
    if (balance <= 0) return NextResponse.json({ message: 'You are out of credits' }, { status: 402 })

    const [styleGuide, inspirationUrls] = await Promise.all([
      StyleGuideQuery(projectId),
      InspirationImagesQuery(projectId),
    ])
    const sketch = new Uint8Array(await image.arrayBuffer())

    // Charged up front: the response streams, so by the time it finishes there
    // is no longer a request to fail cleanly on.
    const token = await convexAuthNextjsToken()
    await fetchMutation(api.credits.spend, {}, { token })

    const result = streamText({
      model: anthropicProvider(MODEL),
      providerOptions: { anthropic: { effort: 'low' } },
      maxOutputTokens: 16000,
      system: `${prompts.generatedUi.system}\n\n## The project's design system\n\n${describeStyleGuide(styleGuide, inspirationUrls.length)}`,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompts.generatedUi.user(frameLabel, inspirationUrls.length) },
            { type: 'file', mediaType: image.type, data: sketch },
            // Order matters: the prompt tells the model the first image is the
            // sketch and the rest are references to borrow style from.
            ...inspirationUrls.map((url) => ({ type: 'image' as const, image: new URL(url) })),
          ],
        },
      ],
    })

    // The SDK's text stream is an async iterable; the browser wants bytes.
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk))
          }
        } catch (error) {
          controller.error(error)
          return
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        // Without this a proxy buffers the whole design and it arrives at once.
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('[generate]', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate the design' },
      { status: 500 },
    )
  }
}
