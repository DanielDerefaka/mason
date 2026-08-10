import { fetchMutation } from 'convex/nextjs'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { generateText, tool } from 'ai'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { anthropicProvider, MODEL } from '@/lib/anthropic'
import { fetchImageParts } from '@/lib/fetch-image'
import { prompts } from '@/prompts'
import { ReferenceBriefSchema, type ReferenceBrief } from '@/types/style-guide'

/**
 * Reads the inspiration board, but only when the stored reading is stale.
 *
 * This used to be its own endpoint fired on upload, which made it the one
 * generation route that reached the model without spending a credit — the
 * same hole as the `/api/ai` route deleted two rounds ago, and free to
 * trigger repeatedly by adding an image.
 *
 * Folding it into the generation that needs it closes that without charging
 * for a step nobody asked for: the caller has already paid for this
 * generation, and the brief is cached against the board it was read from, so
 * the extra call happens once per board rather than once per design.
 *
 * Never throws. A board that cannot be read should produce a design without a
 * brief, not no design at all.
 */
/**
 * The cache key carries a fingerprint of the extraction prompt, not just the
 * board.
 *
 * Keyed on the images alone, a stored brief outlives the prompt that produced
 * it: improve what the extraction is told to look for, regenerate against the
 * same board, and the old reading comes straight back out of the cache. The
 * prompt change looks like it did nothing, which is the worst way for a change
 * to fail — it survives testing.
 *
 * A cheap hash is enough. It only has to differ when the prompt differs.
 */
const briefVersion = () => {
  let hash = 0
  const source = prompts.referenceBrief.system
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) | 0
  }
  return `b${(hash >>> 0).toString(36)}`
}

export const ensureReferenceBrief = async (
  projectId: Id<'projects'>,
  urls: string[],
  stored: { brief: ReferenceBrief | null; key: string | null },
): Promise<ReferenceBrief | null> => {
  if (urls.length === 0) return null

  const key = `${briefVersion()}|${urls.join('|')}`
  if (stored.brief && stored.key === key) return stored.brief

  try {
    const parts = await fetchImageParts(urls)
    if (parts.length === 0) return stored.brief

    let brief: unknown = null

    await generateText({
      model: anthropicProvider(MODEL),
      providerOptions: { anthropic: { effort: 'low' } },
      maxOutputTokens: 4000,
      system: prompts.referenceBrief.system,
      // A forced tool call rather than structured output: the gateway drops
      // output_config, so a tool call is the portable way to get a shape.
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
    if (!parsed.success) return stored.brief

    const token = await convexAuthNextjsToken()
    await fetchMutation(
      api.inspiration.setReferenceBrief,
      { projectId, brief: parsed.data, key },
      { token },
    )

    return parsed.data
  } catch (error) {
    console.error('[reference-brief] extraction failed', error)
    return stored.brief
  }
}
