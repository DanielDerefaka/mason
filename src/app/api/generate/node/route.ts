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

    const { projectId, html, instruction } = (await request.json()) as {
      projectId?: string
      html?: string
      instruction?: string
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

    const result = streamText({
      model,
      // Low on purpose, unlike the page-writing routes: this is one element
      // whose direction the page already decided, and it has to come back in
      // seconds. Deliberation here redesigns the element instead of editing it.
      providerOptions: { anthropic: { effort: 'low' } },
      // One element, not a page — a fraction of the room a full revision
      // needs, and it comes back in a couple of seconds rather than a minute.
      maxOutputTokens: 4000,
      system: [
        prompts.generatedUi.system,
        `## Editing one element\n\n${prompts.node.system}`,
        `## The project's design system\n\n${describeStyleGuide(styleGuide, inspirationUrls.length)}`,
        `## Reference image URLs\n\n${describeImagery(inspirationUrls.length)}`,
      ].join('\n\n'),
      messages: [{ role: 'user', content: prompts.node.user(instruction, html) }],
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
        try {
          for await (const chunk of result.textStream) controller.enqueue(encoder.encode(chunk))
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
