import { NextResponse, type NextRequest } from 'next/server'
import { streamText } from 'ai'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { describeGenerationFailure, failedBeforeStreaming, modelForRequest } from '@/lib/byok'
import { chargeForGeneration } from '@/lib/generation-charge'
import {
  CreditsBalanceQuery,
  InspirationImagesQuery,
  ReferenceBriefQuery,
  StyleGuideQuery,
} from '@/convex/query.config'
import { prompts } from '@/prompts'
import { EMPTY_MARKER, isUnusable } from '@/lib/truncation'
import { checkRateLimit } from '@/lib/rate-limit'
import { describeStyleGuide } from '@/lib/style-guide-brief'
import { describeImagery, describeReferenceBrief } from '@/lib/imagery-brief'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const limit = await checkRateLimit()
    if (!limit.ok) {
      return NextResponse.json(
        { message: `Too many requests. Try again in ${limit.retryAfter}s` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
      )
    }

    // BYOK: the request's own key, direct to Anthropic; not charged for, and
    // that is a decision — the visitor pays Anthropic.
    const { model, byok } = modelForRequest(request)

    const { ok, balance } = await CreditsBalanceQuery()
    if (!ok) return NextResponse.json({ message: 'Could not read your credit balance' }, { status: 401 })
    if (!byok && balance <= 0) return NextResponse.json({ message: 'You are out of credits' }, { status: 402 })

    const { projectId, html } = (await request.json()) as {
      projectId?: string
      html?: string
    }

    if (!projectId || !html?.trim()) {
      return NextResponse.json(
        { message: 'A project and the design to adapt are required' },
        { status: 400 },
      )
    }

    const [styleGuide, inspirationUrls] = await Promise.all([
      StyleGuideQuery(projectId as Id<'projects'>),
      InspirationImagesQuery(projectId as Id<'projects'>),
    ])
    const { brief: referenceBrief } = await ReferenceBriefQuery(projectId as Id<'projects'>)

    const token = await convexAuthNextjsToken()
    const { refundCredit } = await chargeForGeneration({ byok, token })

    const result = streamText({
      model,
      providerOptions: { anthropic: { effort: 'low' } },
      // A restructured page is as long as the one it came from — six cards of copy plus their styles ran
      // past 16k and the stream simply stopped, leaving a half-written
      // element and no footer. Truncation is reported below rather
      // than saved silently.
      maxOutputTokens: 32000,
      system: [
        prompts.generatedUi.system,
        `## Producing the mobile version\n\n${prompts.mobile.system}`,
        `## The project's design system\n\n${describeStyleGuide(styleGuide, inspirationUrls.length)}`,
        ...(describeReferenceBrief(referenceBrief)
          ? [`## What the references actually look like\n\n${describeReferenceBrief(referenceBrief)}`]
          : []),
        `## Reference image URLs\n\n${describeImagery(inspirationUrls.length)}`,
      ].join('\n\n'),
      messages: [{ role: 'user', content: prompts.mobile.user(html) }],
    })

    // Answered before any header goes out: a refused key comes back from
    // Anthropic as a 401, and once streaming has begun there is no status left
    // to carry it. Nothing was produced, so nothing is owed.
    const refused = await failedBeforeStreaming(result.fullStream)
    if (refused) {
      await refundCredit()
      throw refused
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let produced = ''
        try {
          for await (const chunk of result.textStream) {
            produced += chunk
            controller.enqueue(encoder.encode(chunk))
          }

          // A length stop means the design is incomplete, not merely short.
          // The marker is an HTML comment, which the sanitiser drops anyway,
          // so it can never reach the rendered design.
          // Finished cleanly with nothing in it. The stream never errored, so
          // the refund path above never ran — without this the credit is spent
          // on silence and the canvas waits for a chunk that already came and
          // went.
          if (isUnusable(produced)) {
            await refundCredit()
            controller.enqueue(encoder.encode(EMPTY_MARKER))
            controller.close()
            return
          }

          if ((await result.finishReason) === 'length') {
            // Cut off at the ceiling: the page is incomplete, so the credit
            // goes back. The marker tells the client to say so.
            await refundCredit()
            controller.enqueue(encoder.encode('<!--mason:truncated-->'))
          }
        } catch (error) {
          // The stream died part-way. Nothing usable came back, so neither
          // should the charge.
          await refundCredit()
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
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    const { status, message } = describeGenerationFailure('[generate/mobile]', error, request, 'Failed to build the mobile version')
    return NextResponse.json({ message }, { status })
  }
}
