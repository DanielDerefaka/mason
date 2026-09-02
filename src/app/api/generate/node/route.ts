import { NextResponse, type NextRequest } from 'next/server'
import { streamText } from 'ai'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { describeGenerationFailure, failedBeforeStreaming, modelForRequest } from '@/lib/byok'
import { chargeForGeneration } from '@/lib/generation-charge'
import {
  CreditsBalanceQuery,
  InspirationImagesQuery,
  StyleGuideQuery,
} from '@/convex/query.config'
import { prompts } from '@/prompts'
import { EMPTY_MARKER, TRUNCATION_MARKER, isUnusable } from '@/lib/truncation'
import { checkRateLimit } from '@/lib/rate-limit'
import { describeStyleGuide } from '@/lib/style-guide-brief'
import { describeImagery } from '@/lib/imagery-brief'

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

    const { projectId, html, instruction, context } = (await request.json()) as {
      projectId?: string
      html?: string
      instruction?: string
      context?: { stylesheet?: unknown; ancestors?: unknown }
    }

    if (!projectId || !html?.trim() || !instruction?.trim()) {
      return NextResponse.json(
        { message: 'A project, the element and a request are required' },
        { status: 400 },
      )
    }

    const [styleGuide, inspirationUrls] = await Promise.all([
      StyleGuideQuery(projectId as Id<'projects'>),
      InspirationImagesQuery(projectId as Id<'projects'>),
    ])

    const token = await convexAuthNextjsToken()
    const { refundCredit } = await chargeForGeneration({ byok, token })

    // Reference only, so a stray shape in the body cannot reach the prompt.
    const nodeContext = {
      stylesheet: typeof context?.stylesheet === 'string' ? context.stylesheet : undefined,
      ancestors: typeof context?.ancestors === 'string' ? context.ancestors : undefined,
    }

    const result = streamText({
      model,
      providerOptions: { anthropic: { effort: 'low' } },
      // The ceiling follows the input. It was a flat 4000 on the reasoning
      // that one element is a fraction of a page — but the editor's own
      // "Make responsive" chip is meant to be run on the outermost group, and
      // the preview banner sends people to do exactly that, so this route is
      // routinely asked to return the whole design. 4000 tokens is roughly
      // 12-16 KB of HTML; a page with its stylesheet is 25-60 KB. The answer
      // came back ending a third of the way down and nothing noticed. Half
      // the input's length in tokens is generous for a rewrite of it, floored
      // where a small element still has room to grow and capped where a full
      // revision is.
      maxOutputTokens: Math.min(32000, Math.max(4000, Math.ceil(html.length / 2))),
      system: [
        prompts.generatedUi.system,
        `## Editing one element\n\n${prompts.node.system}`,
        `## The project's design system\n\n${describeStyleGuide(styleGuide, inspirationUrls.length)}`,
        `## Reference image URLs\n\n${describeImagery(inspirationUrls.length)}`,
      ].join('\n\n'),
      messages: [{ role: 'user', content: prompts.node.user(instruction, html, nodeContext) }],
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

          // Finished cleanly with nothing in it. The stream never errored, so
          // the refund path below never ran — without this the credit is spent
          // on silence and the editor swaps the element for nothing. Both
          // markers are HTML comments, which the sanitiser drops anyway, so
          // neither can reach the rendered design.
          if (isUnusable(produced)) {
            await refundCredit()
            controller.enqueue(encoder.encode(EMPTY_MARKER))
            controller.close()
            return
          }

          if ((await result.finishReason) === 'length') {
            // Cut off at the ceiling: the element is incomplete, so the credit
            // goes back. The marker tells the editor to leave the tree alone.
            await refundCredit()
            controller.enqueue(encoder.encode(TRUNCATION_MARKER))
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
    const { status, message } = describeGenerationFailure('[generate/node]', error, request, 'Failed to edit that element')
    return NextResponse.json({ message }, { status })
  }
}
