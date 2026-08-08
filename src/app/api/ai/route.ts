import { anthropic, MODEL, THINKING } from '@/lib/anthropic'

// The SDK needs Node builtins, so this cannot run on the edge runtime.
export const runtime = 'nodejs'

/**
 * Streams a completion back as plain text. The auth middleware already gates
 * everything under /api that is not a webhook, so there is no session check here.
 */
export async function POST(request: Request) {
  const { prompt, effort = 'medium' } = (await request.json()) as {
    prompt?: string
    effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
  }

  if (!prompt?.trim()) {
    return Response.json({ error: 'prompt is required' }, { status: 400 })
  }

  const stream = anthropic.messages.stream({
    model: MODEL,
    // Generous, because thinking and the answer share this budget.
    max_tokens: 16000,
    thinking: THINKING,
    output_config: { effort },
    messages: [{ role: 'user', content: prompt }],
  })

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        // Only the answer text — thinking summaries stay server-side.
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (error) {
        controller.error(error)
        return
      }
      controller.close()
    },
    cancel() {
      stream.abort()
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Stops proxies buffering the stream into one lump.
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
