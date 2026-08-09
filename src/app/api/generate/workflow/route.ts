import { NextResponse, type NextRequest } from 'next/server'
import { streamText } from 'ai'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { anthropicProvider, MODEL } from '@/lib/anthropic'
import { CreditsBalanceQuery, StyleGuideQuery } from '@/convex/query.config'
import { prompts } from '@/prompts'
import { describeStyleGuide } from '@/lib/style-guide-brief'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const { projectId, sourceHtml, title, purpose } = (await request.json()) as {
      projectId?: string
      sourceHtml?: string
      title?: string
      purpose?: string
    }

    if (!projectId || !sourceHtml?.trim() || !title) {
      return NextResponse.json(
        { message: 'A project, a source design and a page title are required' },
        { status: 400 },
      )
    }

    const { ok, balance } = await CreditsBalanceQuery()
    if (!ok) return NextResponse.json({ message: 'Could not read your credit balance' }, { status: 401 })
    if (balance <= 0) return NextResponse.json({ message: 'You are out of credits' }, { status: 402 })

    const styleGuide = await StyleGuideQuery(projectId as Id<'projects'>)

    const token = await convexAuthNextjsToken()
    await fetchMutation(api.credits.spend, {}, { token })

    const result = streamText({
      model: anthropicProvider(MODEL),
      providerOptions: { anthropic: { effort: 'low' } },
      maxOutputTokens: 16000,
      system: [
        prompts.generatedUi.system,
        `## The screen you are designing now\n\n${prompts.workflow.page.system}`,
        `## The project's design system\n\n${describeStyleGuide(styleGuide, 0)}`,
      ].join('\n\n'),
      messages: [
        {
          role: 'user',
          // Trimmed: the source is only a consistency reference, and a long one
          // crowds out the budget the new screen needs.
          content: prompts.workflow.page.user(title, purpose ?? '', sourceHtml.slice(0, 24000)),
        },
      ],
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) controller.enqueue(encoder.encode(chunk))
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
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('[generate/workflow]', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate the page' },
      { status: 500 },
    )
  }
}
