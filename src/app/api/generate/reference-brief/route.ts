import { NextResponse, type NextRequest } from 'next/server'
import { generateText, tool } from 'ai'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'

import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { anthropicProvider, MODEL } from '@/lib/anthropic'
import { InspirationImagesQuery } from '@/convex/query.config'
import { fetchImageParts } from '@/lib/fetch-image'
import { prompts } from '@/prompts'
import { checkRateLimit } from '@/lib/rate-limit'
import { ReferenceBriefSchema } from '@/types/style-guide'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Reads the inspiration board once and writes down what it saw.
 *
 * Separate from generation on purpose. A design call is already reading a
 * sketch, obeying a design system and writing a page — asking it to study a
 * photograph properly at the same time is asking for the easy half of the job.
 * This does one thing, and its output is text, which cannot be half-noticed
 * the way an image can.
 *
 * Runs once per board rather than once per design, so a whole generated flow
 * shares one reading of the reference instead of five independent ones.
 *
 * No credit is charged: it is triggered by uploading images rather than by
 * asking for something, and charging for a step the user did not request would
 * be a surprise. The abuse ceiling is re-reading your own board, which is
 * bounded — and it is rate-limited alongside every other generation route.
 */
export async function POST(request: NextRequest) {
  try {
    const limit = await checkRateLimit()
    if (!limit.ok) {
      return NextResponse.json(
        { message: `Too many requests — try again in ${limit.retryAfter}s` },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
      )
    }

    const { projectId } = (await request.json()) as { projectId?: string }
    if (!projectId) {
      return NextResponse.json({ message: 'A project is required' }, { status: 400 })
    }

    const urls = await InspirationImagesQuery(projectId as Id<'projects'>)
    if (urls.length === 0) {
      return NextResponse.json({ message: 'No references to read' }, { status: 400 })
    }

    // Bytes rather than URLs: the gateway rejects a remote image whose MIME
    // type it cannot resolve, which a Convex storage URL routinely is.
    const parts = await fetchImageParts(urls)
    if (parts.length === 0) {
      return NextResponse.json({ message: 'Could not read those images' }, { status: 400 })
    }

    let brief: unknown = null

    await generateText({
      model: anthropicProvider(MODEL),
      providerOptions: { anthropic: { effort: 'low' } },
      maxOutputTokens: 4000,
      system: prompts.referenceBrief.system,
      // A forced tool call rather than structured output: the gateway drops
      // output_config, and a tool call is the portable way to get a shape.
      tools: {
        brief: tool({
          description: 'Record how the references are built.',
          inputSchema: ReferenceBriefSchema,
          execute: async (input) => {
            brief = input
            return 'recorded'
          },
        }),
      },
      toolChoice: { type: 'tool', toolName: 'brief' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompts.referenceBrief.user(parts.length) },
            ...parts,
          ],
        },
      ],
    })

    const parsed = ReferenceBriefSchema.safeParse(brief)
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'The reference read came back in the wrong shape' },
        { status: 502 },
      )
    }

    const token = await convexAuthNextjsToken()
    await fetchMutation(
      api.inspiration.setReferenceBrief,
      { projectId: projectId as Id<'projects'>, brief: parsed.data, key: urls.join('|') },
      { token },
    )

    return NextResponse.json({ brief: parsed.data })
  } catch (error) {
    console.error('[generate/reference-brief]', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Could not read the references' },
      { status: 500 },
    )
  }
}
