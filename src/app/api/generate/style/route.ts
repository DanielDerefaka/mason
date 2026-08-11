import { NextResponse, type NextRequest } from 'next/server'
import { generateText, tool } from 'ai'
import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { anthropicProvider, MODEL } from '@/lib/anthropic'
import { CreditsBalanceQuery, MoodBoardImagesQuery } from '@/convex/query.config'
import { resolveFont } from '@/lib/fonts'
import { checkRateLimit } from '@/lib/rate-limit'
import { prompts } from '@/prompts'
import { fetchImages } from '@/lib/fetch-image'
import { StyleGuideSchema } from '@/types/style-guide'

// The AI SDK and the Convex server client both need Node builtins.
export const runtime = 'nodejs'

// Vision over several images plus a full palette runs to a few minutes; the
// platform default of 15s is nowhere near enough.
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
    if (!ok) {
      return NextResponse.json(
        { success: false, message: 'Could not read your credit balance' },
        { status: 401 },
      )
    }
    if (balance <= 0) {
      return NextResponse.json(
        { success: false, message: 'You are out of credits' },
        { status: 402 },
      )
    }

    const body = (await request.json()) as { projectId?: string }
    const projectId = body.projectId as Id<'projects'> | undefined

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: 'Project ID is required' },
        { status: 400 },
      )
    }

    const moodBoardImages = await MoodBoardImagesQuery(projectId)
    const imageUrls = moodBoardImages.map((image) => image.url).filter(Boolean)

    if (imageUrls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No mood board images found. Please upload images to the mood board first.',
        },
        { status: 400 },
      )
    }

    const { parts: moodBoardParts, failures } = await fetchImages(imageUrls)
    if (moodBoardParts.length === 0) {
      // Say which way it failed. "Try re-uploading them" is useless advice
      // when the file was fine and the fetch was the problem.
      const reasons = new Set(failures.map((failure) => failure.reason))
      const message = reasons.has('unreachable')
        ? 'Could not download the mood board images. They may still be uploading — try again in a moment.'
        : reasons.has('not-an-image')
          ? 'Those files are not images. Upload PNG, JPEG or WebP.'
          : 'Could not read those images. Re-export them as PNG or JPEG and upload again.'

      console.error('[generate/style] no readable mood board images', failures)
      return NextResponse.json({ success: false, message }, { status: 400 })
    }

    /**
     * A forced tool call rather than `generateObject`.
     *
     * `generateObject` leans on the provider's native structured outputs, and
     * gateways in front of Anthropic tend to drop `output_config` — the request
     * still returns 200, but the model answers in prose and parsing fails. A
     * tool schema travels as a normal part of the request, so it survives the
     * hop and the model is obliged to fill it in.
     */
    const result = await generateText({
      model: anthropicProvider(MODEL),
      // The default effort thinks for minutes on a task this open-ended, and
      // the extra deliberation drifts toward a generic palette rather than the
      // one in the images.
      providerOptions: { anthropic: { effort: 'low' } },
      // A full guide runs to ~3.5k output tokens. Below roughly double that the
      // tool input gets truncated mid-JSON, and a truncated call arrives as a
      // successful response carrying an unparseable object.
      maxOutputTokens: 8000,
      system: prompts.styleGuide.system,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompts.styleGuide.user(imageUrls.length) },
            ...moodBoardParts,
          ],
        },
      ],
      tools: {
        style_guide: tool({
          description: 'Return the finished design system derived from the mood board.',
          inputSchema: StyleGuideSchema,
        }),
      },
      toolChoice: { type: 'tool', toolName: 'style_guide' },
    })

    const call = result.toolCalls[0]
    if (!call) {
      return NextResponse.json(
        { success: false, message: 'The model did not return a style guide. Try again.' },
        { status: 502 },
      )
    }

    // Parse rather than cast: the tool schema is a strong hint, not a guarantee.
    const parsed = StyleGuideSchema.safeParse(call.input)
    if (!parsed.success) {
      console.error('[generate/style] malformed style guide', parsed.error.issues)
      return NextResponse.json(
        { success: false, message: 'The model returned an incomplete style guide. Try again.' },
        { status: 502 },
      )
    }
    /**
     * The model is good at reading type and bad at knowing what Google hosts.
     * A commercial face named exactly right still 404s on the stylesheet and
     * falls back to the app font with no error anywhere, which looks like the
     * font having been identified wrongly. Resolved to something that will
     * actually load before it is stored, so every surface that renders this
     * guide renders the same face.
     */
    const { family, substituted } = await resolveFont(parsed.data.typography.fontFamily)
    if (substituted) {
      console.info(
        `[generate/style] font "${parsed.data.typography.fontFamily}" is not on Google Fonts — using "${family}"`,
      )
    }
    const styleGuide = {
      ...parsed.data,
      typography: { ...parsed.data.typography, fontFamily: family },
    }

    const token = await convexAuthNextjsToken()
    await fetchMutation(api.project.saveStyleGuide, { projectId, styleGuide }, { token })
    // Charged only once there is something to show for it.
    const { balance: remaining } = await fetchMutation(api.credits.spend, {}, { token })

    return NextResponse.json({ success: true, styleGuide, credits: remaining })
  } catch (error) {
    console.error('[generate/style]', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate style guide',
      },
      { status: 500 },
    )
  }
}
