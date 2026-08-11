import { NextResponse, type NextRequest } from 'next/server'
import { streamText } from 'ai'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { anthropicProvider, UI_MODEL } from '@/lib/anthropic'
import {
  CreditsBalanceQuery,
  InspirationImagesQuery,
  ReferenceBriefQuery,
  StyleGuideQuery,
} from '@/convex/query.config'
import { prompts } from '@/prompts'
import { EMPTY_MARKER, TRUNCATION_MARKER, isUnusable } from '@/lib/truncation'
import { ensureReferenceBrief } from '@/lib/reference-brief'
import { isDevicePresetName } from '@/lib/frame-presets'
import { checkRateLimit } from '@/lib/rate-limit'
import { describeStyleGuide } from '@/lib/style-guide-brief'
import { describeImagery, describeReferenceBrief } from '@/lib/imagery-brief'
import { fetchImageParts } from '@/lib/fetch-image'

export const runtime = 'nodejs'
export const maxDuration = 300


export async function POST(request: NextRequest) {
  try {
    const limit = await checkRateLimit()
    if (!limit.ok) {
      return NextResponse.json(
        { message: `Too many requests — try again in ${limit.retryAfter}s` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
      )
    }

    const { ok, balance } = await CreditsBalanceQuery()
    if (!ok) return NextResponse.json({ message: 'Could not read your credit balance' }, { status: 401 })
    if (balance <= 0) return NextResponse.json({ message: 'You are out of credits' }, { status: 402 })

    const form = await request.formData()
    const image = form.get('image')
    const projectId = form.get('projectId') as Id<'projects'> | null
    const rawFrameLabel = (form.get('frameLabel') as string | null) ?? ''
    // A frame left at its preset name carries no information about content —
    // and passed on, it becomes the subject of the design.
    const frameLabel = isDevicePresetName(rawFrameLabel) ? '' : rawFrameLabel

    if (!(image instanceof File) || !image.type.startsWith('image/')) {
      return NextResponse.json({ message: 'A frame image is required' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 })
    }

    const [styleGuide, inspirationUrls] = await Promise.all([
      StyleGuideQuery(projectId),
      InspirationImagesQuery(projectId),
    ])
    // Read the board only if the stored reading no longer matches it. The
    // credit for this generation covers it; it happens once per board.
    const referenceBrief = await ensureReferenceBrief(
      projectId,
      inspirationUrls,
      await ReferenceBriefQuery(projectId),
    )
    const sketch = new Uint8Array(await image.arrayBuffer())

    // Charged up front: the response streams, so by the time it finishes there
    // is no longer a request to fail cleanly on.
    const token = await convexAuthNextjsToken()
    await fetchMutation(api.credits.spend, {}, { token })

    /** Puts the credit back when nothing usable came out of the model. */
    const refundCredit = async () => {
      try {
        await fetchMutation(api.credits.refund, {}, { token })
      } catch {
        // A failed refund must not also break the response the user is
        // already reading.
      }
    }

    const inspirationParts = await fetchImageParts(inspirationUrls)

    const result = streamText({
      model: anthropicProvider(UI_MODEL),
      providerOptions: { anthropic: { effort: 'low' } },
      // A full page of inline-styled markup is verbose — six cards of copy plus their styles ran
      // past 16k and the stream simply stopped, leaving a half-written
      // element and no footer. Truncation is reported below rather
      // than saved silently.
      maxOutputTokens: 32000,
      system: [
        prompts.generatedUi.system,
        `## The project's design system\n\n${describeStyleGuide(styleGuide, inspirationUrls.length)}`,
        ...(describeReferenceBrief(referenceBrief)
          ? [`## What the references actually look like\n\n${describeReferenceBrief(referenceBrief)}`]
          : []),
        `## Reference image URLs\n\n${describeImagery(inspirationUrls.length)}`,
      ].join('\n\n'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompts.generatedUi.user(frameLabel, inspirationUrls.length) },
            { type: 'file', mediaType: image.type, data: sketch },
            // Order matters: the prompt tells the model the first image is the
            // sketch and the rest are references to borrow style from.
            ...inspirationParts,
          ],
        },
      ],
    })

    // The SDK's text stream is an async iterable; the browser wants bytes.
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let produced = ''
        try {
          for await (const chunk of result.textStream) {
            produced += chunk
            controller.enqueue(encoder.encode(chunk))
          }
        } catch (error) {
          // The stream died part-way. Nothing usable came back, so neither
          // should the charge.
          await refundCredit()
          controller.error(error)
          return
        }

        // Finished cleanly with nothing in it. The stream never errored, so
        // the refund above never ran — without this the credit is spent on
        // silence and the canvas waits for a chunk that already came and went.
        if (isUnusable(produced)) {
          await refundCredit()
          controller.enqueue(encoder.encode(EMPTY_MARKER))
          controller.close()
          return
        }

        // A length stop means the design is incomplete, not merely short. This
        // route was the one path that never said so: the client has always
        // looked for the marker, and nothing here ever appended it, so a first
        // generation cut off at the ceiling was saved as though it were whole.
        if ((await result.finishReason) === 'length') {
          await refundCredit()
          controller.enqueue(encoder.encode(TRUNCATION_MARKER))
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
