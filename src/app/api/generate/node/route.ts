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
        { message: `Too many requests — try again in ${limit.retryAfter}s` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
      )
    }

    const { ok, balance } = await CreditsBalanceQuery()
    if (!ok) return NextResponse.json({ message: 'Could not read your credit balance' }, { status: 401 })
    if (balance <= 0) return NextResponse.json({ message: 'You are out of credits' }, { status: 402 })

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
    console.error('[generate/node]', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to edit that element' },
      { status: 500 },
    )
  }
}
