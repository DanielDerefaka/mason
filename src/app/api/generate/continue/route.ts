import { NextResponse, type NextRequest } from 'next/server'
import { streamText } from 'ai'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { anthropicProvider, UI_MODEL } from '@/lib/anthropic'
import {
  CreditsBalanceQuery,
  InspirationImagesQuery,
  ReferenceBriefQuery,
  StyleGuideQuery,
} from '@/convex/query.config'
import { prompts } from '@/prompts'
import { checkRateLimit } from '@/lib/rate-limit'
import { describeStyleGuide } from '@/lib/style-guide-brief'
import { describeImagery, describeReferenceBrief } from '@/lib/imagery-brief'

/**
 * Picking a design back up where the model stopped writing.
 *
 * A generation that hits the output ceiling leaves a half-written element and
 * no footer — a page that was mostly right, thrown away. Regenerating costs a
 * full credit and rolls the dice again on a design the user may already like.
 * This writes only the remainder, and the client staples it on.
 *
 * It costs a credit, because it is a full model call over the whole design.
 */
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

    const { projectId, html } = (await request.json()) as {
      projectId?: string
      html?: string
    }

    if (!projectId || !html?.trim()) {
      return NextResponse.json(
        { message: 'A project and the design to continue are required' },
        { status: 400 },
      )
    }

    const [styleGuide, inspirationUrls] = await Promise.all([
      StyleGuideQuery(projectId as Id<'projects'>),
      InspirationImagesQuery(projectId as Id<'projects'>),
    ])
    const { brief: referenceBrief } = await ReferenceBriefQuery(projectId as Id<'projects'>)

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

    const result = streamText({
      model: anthropicProvider(UI_MODEL),
      providerOptions: { anthropic: { effort: 'low' } },
      // A revision returns the whole design — six cards of copy plus their styles ran
      // past 16k and the stream simply stopped, leaving a half-written
      // element and no footer. Truncation is reported below rather
      // than saved silently.
      maxOutputTokens: 32000,
      system: [
        prompts.generatedUi.system,
        `## Continuing\n\n${prompts.continuation.system}`,
        `## The project's design system\n\n${describeStyleGuide(styleGuide, inspirationUrls.length)}`,
        ...(describeReferenceBrief(referenceBrief)
          ? [`## What the references actually look like\n\n${describeReferenceBrief(referenceBrief)}`]
          : []),
        `## Reference image URLs\n\n${describeImagery(inspirationUrls.length)}`,
      ].join('\n\n'),
      messages: [{ role: 'user', content: prompts.continuation.user(html) }],
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) controller.enqueue(encoder.encode(chunk))

          // A length stop means the design is incomplete, not merely short.
          // The marker is an HTML comment, which the sanitiser drops anyway,
          // so it can never reach the rendered design.
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
    console.error('[generate/continue]', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to continue the design' },
      { status: 500 },
    )
  }
}
