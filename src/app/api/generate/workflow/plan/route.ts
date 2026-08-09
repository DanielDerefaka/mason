import { NextResponse, type NextRequest } from 'next/server'
import { generateText, tool } from 'ai'
import { anthropicProvider, MODEL } from '@/lib/anthropic'
import { CreditsBalanceQuery } from '@/convex/query.config'
import { prompts } from '@/prompts'
import { WorkflowPlanSchema } from '@/types/workflow'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const { sourceHtml, pageCount = 3 } = (await request.json()) as {
      sourceHtml?: string
      pageCount?: number
    }

    if (!sourceHtml?.trim()) {
      return NextResponse.json({ message: 'A source design is required' }, { status: 400 })
    }

    const { ok, balance } = await CreditsBalanceQuery()
    if (!ok) return NextResponse.json({ message: 'Could not read your credit balance' }, { status: 401 })
    // Each page costs a credit, so refuse a flow that would run dry halfway.
    if (balance < pageCount) {
      return NextResponse.json(
        { message: `A ${pageCount}-page flow needs ${pageCount} credits; you have ${balance}.` },
        { status: 402 },
      )
    }

    // Same forced-tool trick as the style guide: the gateway drops
    // output_config, so a schema only survives as a tool.
    const result = await generateText({
      model: anthropicProvider(MODEL),
      providerOptions: { anthropic: { effort: 'low' } },
      maxOutputTokens: 2000,
      system: prompts.workflow.plan.system,
      messages: [
        {
          role: 'user',
          content: `${prompts.workflow.plan.user(pageCount)}\n\n${sourceHtml.slice(0, 20000)}`,
        },
      ],
      tools: {
        workflow_plan: tool({
          description: 'Return the screens that should follow the one supplied.',
          inputSchema: WorkflowPlanSchema,
        }),
      },
      toolChoice: { type: 'tool', toolName: 'workflow_plan' },
    })

    const parsed = WorkflowPlanSchema.safeParse(result.toolCalls[0]?.input)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Could not plan the flow. Try again.' }, { status: 502 })
    }

    return NextResponse.json({ pages: parsed.data.pages.slice(0, pageCount) })
  } catch (error) {
    console.error('[generate/workflow/plan]', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to plan the flow' },
      { status: 500 },
    )
  }
}
