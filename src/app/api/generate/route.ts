import { NextResponse, type NextRequest } from 'next/server'
import { streamText } from 'ai'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import type { Id } from '../../../../convex/_generated/dataModel'
import { UI_MODEL } from '@/lib/anthropic'
import {
  describeGenerationFailure,
  failedBeforeStreaming,
  modelForRequest,
  modelForRequestText,
} from '@/lib/byok'
import { chargeForGeneration } from '@/lib/generation-charge'
import {
  CreditsBalanceQuery,
  InspirationImagesQuery,
  ReferenceBriefQuery,
  BrandQuery,
  StyleGuideQuery,
} from '@/convex/query.config'
import { prompts } from '@/prompts'
import { EMPTY_MARKER, TRUNCATION_MARKER, isUnusable } from '@/lib/truncation'
import { ensureReferenceBrief } from '@/lib/reference-brief'
import { isDevicePresetName } from '@/lib/frame-presets'
import { checkRateLimit } from '@/lib/rate-limit'
import { describeStyleGuide } from '@/lib/style-guide-brief'
import { describeBrand, describeImagery, describeReferenceBrief } from '@/lib/imagery-brief'
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

    // BYOK: the request's own key, direct to Anthropic; not charged for, and
    // that is a decision — the visitor pays Anthropic.
    const { model, byok } = modelForRequest(request)

    const { ok, balance } = await CreditsBalanceQuery()
    if (!ok) return NextResponse.json({ message: 'Could not read your credit balance' }, { status: 401 })
    if (!byok && balance <= 0) return NextResponse.json({ message: 'You are out of credits' }, { status: 402 })

    const form = await request.formData()
    const image = form.get('image')
    const projectId = form.get('projectId') as Id<'projects'> | null
    const rawFrameLabel = (form.get('frameLabel') as string | null) ?? ''
    // A frame left at its preset name carries no information about content —
    // and passed on, it becomes the subject of the design.
    const frameLabel = isDevicePresetName(rawFrameLabel) ? '' : rawFrameLabel
    // What the person who drew the frame said it is for, if anything. Capped
    // rather than refused: a sentence too long is still a sentence.
    const instruction = ((form.get('instruction') as string | null) ?? '').trim().slice(0, 600)

    if (!(image instanceof File) || !image.type.startsWith('image/')) {
      return NextResponse.json({ message: 'A frame image is required' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 })
    }

    const [styleGuide, inspirationUrls, brand] = await Promise.all([
      StyleGuideQuery(projectId),
      InspirationImagesQuery(projectId),
      BrandQuery(projectId),
    ])
    // Read the board only if the stored reading no longer matches it. The
    // credit for this generation covers it; it happens once per board.
    const referenceBrief = await ensureReferenceBrief(
      projectId,
      inspirationUrls,
      await ReferenceBriefQuery(projectId),
      modelForRequestText(request).model,
    )
    const sketch = new Uint8Array(await image.arrayBuffer())

    // Charged up front: the response streams, so by the time it finishes there
    // is no longer a request to fail cleanly on.
    const token = await convexAuthNextjsToken()
    const { refundCredit } = await chargeForGeneration({ byok, token })

    const inspirationParts = await fetchImageParts(inspirationUrls)

    const result = streamText({
      model,
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
        // After the reference on purpose: the reference decides the look, the
        // brand decides the words, and neither should overwrite the other.
        ...(describeBrand(brand ?? null)
          ? [`## The brand this is for\n\n${describeBrand(brand ?? null)}`]
          : []),
      ].join('\n\n'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompts.generatedUi.user(frameLabel, inspirationUrls.length, instruction),
            },
            { type: 'file', mediaType: image.type, data: sketch },
            // Order matters: the prompt tells the model the first image is the
            // sketch and the rest are references to borrow style from.
            ...inspirationParts,
          ],
        },
      ],
    })

    // Answered before any header goes out: a refused key comes back from
    // Anthropic as a 401, and once streaming has begun there is no status left
    // to carry it. Nothing was produced, so nothing is owed.
    const refused = await failedBeforeStreaming(result.fullStream)
    if (refused) {
      await refundCredit()
      throw refused
    }

    // The SDK's text stream is an async iterable; the browser wants bytes.
    const encoder = new TextEncoder()
    const startedAt = Date.now()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let produced = ''
        let chunks = 0
        try {
          for await (const chunk of result.textStream) {
            produced += chunk
            chunks += 1
            controller.enqueue(encoder.encode(chunk))
          }
        } catch (error) {
          // The stream died part-way. The charge goes back either way — the
          // connection failing is not something the caller should pay for.
          await refundCredit()

          /**
           * If enough already arrived, keep it.
           *
           * A gateway that drops a long stream is the common failure here, and
           * throwing away four-fifths of a finished design because the last
           * fifth never came is the worst of the available outcomes. Marked as
           * cut off, it reaches the canvas as a design the caller can press
           * Continue on — the same path a design that hit the output ceiling
           * takes, and that path already exists.
           */
          if (!isUnusable(produced)) {
            console.error(
              '[generate] stream dropped, keeping partial',
              JSON.stringify({
                bytes: produced.length,
                chunks,
                elapsedMs: Date.now() - startedAt,
                reason: error instanceof Error ? error.message : String(error),
              }),
            )
            controller.enqueue(encoder.encode(TRUNCATION_MARKER))
            controller.close()
            return
          }

          controller.error(error)
          return
        }

        // Finished cleanly with nothing in it. The stream never errored, so
        // the refund above never ran — without this the credit is spent on
        // silence and the canvas waits for a chunk that already came and went.
        if (isUnusable(produced)) {
          await refundCredit()

          /**
           * Why a generation came back empty is the one thing the refund does
           * not tell us, and it is the thing worth knowing: a content filter,
           * an immediate stop, a provider that accepted the request and
           * returned nothing, and a prompt that produced only whitespace are
           * four different problems wearing the same face. Everything the SDK
           * knows is recorded here so the next occurrence is diagnosable
           * instead of merely survivable.
           */
          // Each read is wrapped: these settle only once the call completes,
          // and a failure while diagnosing a failure should not replace the
          // diagnosis with a stack trace.
          const settle = async <T,>(value: PromiseLike<T>): Promise<T | null> => {
            try {
              return await value
            } catch {
              return null
            }
          }

          const diagnosis = {
            finishReason: await settle(result.finishReason),
            usage: await settle(result.usage),
            warnings: await settle(Promise.resolve(result.warnings)),
            chunks,
            bytes: produced.length,
            // Whitespace-only output looks identical to nothing at all in a
            // log, and they have different causes.
            whitespaceOnly: produced.length > 0,
            elapsedMs: Date.now() - startedAt,
            model: UI_MODEL,
            hadStyleGuide: Boolean(styleGuide),
            referenceCount: inspirationUrls.length,
          }
          console.error('[generate] empty generation', JSON.stringify(diagnosis))

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
    const { status, message } = describeGenerationFailure('[generate]', error, request, 'Failed to generate the design')
    return NextResponse.json({ message }, { status })
  }
}
