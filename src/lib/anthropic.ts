import { createAnthropic } from '@ai-sdk/anthropic'
import Anthropic from '@anthropic-ai/sdk'

/**
 * Some Anthropic-compatible gateways only answer requests whose User-Agent
 * looks like Claude Code, and return 401 `unauthorized_client_error` otherwise.
 * agentrouter.org is one of them. Left unset — the case for the first-party
 * API — the SDK sends its own agent.
 */
const clientUserAgent = process.env.ANTHROPIC_CLIENT_UA

/**
 * Anthropic's newer identity-linked keys belong to a person rather than to a
 * workspace, and refuse every request that does not name the workspace it acts
 * in: 400 `invalid_request_error`, "anthropic-workspace-id is required when
 * authenticating with an identity-linked API key". A key made in the Console
 * under a workspace needs none of this and the header is simply absent.
 *
 * Unset is therefore the normal case, and setting it wrongly is worse than not
 * setting it — so it is only sent when the environment actually carries one.
 */
export const WORKSPACE_ID = process.env.ANTHROPIC_WORKSPACE_ID?.trim() || undefined

const headers = {
  ...(clientUserAgent ? { 'User-Agent': clientUserAgent } : {}),
  ...(WORKSPACE_ID ? { 'anthropic-workspace-id': WORKSPACE_ID } : {}),
}

const defaultHeaders = Object.keys(headers).length > 0 ? headers : undefined

/**
 * The SDK reads ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL from the environment,
 * so pointing the app at a different gateway is a config change, not a code
 * change. Unset base URL means api.anthropic.com.
 */
export const anthropic = new Anthropic({ defaultHeaders })

export const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-5'

/**
 * The model that writes designs. Separate from MODEL because design generation
 * and structured extraction reward different things, and swapping one should
 * not silently change the other.
 */
export const UI_MODEL = process.env.ANTHROPIC_UI_MODEL ?? MODEL

/**
 * Thinking is on by default on Opus 5, and its raw reasoning is never returned —
 * asking for summaries is what makes the thinking blocks carry readable text
 * instead of an empty string.
 */
export const THINKING = { type: 'adaptive', display: 'summarized' } as const

/**
 * The same gateway, as a Vercel AI SDK provider. Unlike the raw SDK this one
 * wants the version segment in the base URL, so ANTHROPIC_BASE_URL stays
 * version-free and we append it here.
 */
const baseURL = process.env.ANTHROPIC_BASE_URL
  ? `${process.env.ANTHROPIC_BASE_URL.replace(/\/+$/, '')}/v1`
  : undefined

/**
 * Adds a synthetic id to any tool_use block missing one.
 *
 * Not every model behind a gateway emits a conforming Anthropic response: the
 * OpenAI-family ones return tool_use blocks with no `id`, and the SDK validates
 * the response against a schema that requires it — so a perfectly good tool
 * call is thrown away as "Invalid JSON response". The ids only have to be
 * unique within the message, which is all the SDK uses them for.
 */
const repairToolUseIds = (payload: unknown) => {
  if (typeof payload !== 'object' || payload === null) return { payload, changed: false }
  const message = payload as { content?: Array<{ type?: string; id?: string }> }
  if (!Array.isArray(message.content)) return { payload, changed: false }

  let changed = false
  message.content.forEach((block, index) => {
    if (block?.type === 'tool_use' && typeof block.id !== 'string') {
      block.id = `toolu_gateway_${index}`
      changed = true
    }
  })
  return { payload, changed }
}

/**
 * The AI SDK stamps its own `user-agent` after merging the `headers` option, so
 * passing one there is silently overwritten. Rewriting the header on the way
 * out is the only place the override survives — and the response comes back
 * through here too, which is where the tool_use repair happens.
 */
const gatewayFetch: typeof fetch = async (input, init) => {
  const merged = new Headers(init?.headers)
  if (clientUserAgent) merged.set('User-Agent', clientUserAgent)
  // Same place, same reason: the header has to survive whatever the SDK does
  // to the options object, and this is the last hand the request passes
  // through. An identity-linked house key 400s on every call without it.
  if (WORKSPACE_ID) merged.set('anthropic-workspace-id', WORKSPACE_ID)

  const response = await fetch(input, { ...init, headers: merged })

  // Streaming responses pass straight through; only a buffered JSON body can
  // be inspected without breaking the stream.
  if (!response.ok) return response
  if (!(response.headers.get('content-type') ?? '').includes('application/json')) return response

  const text = await response.text()
  try {
    const { payload, changed } = repairToolUseIds(JSON.parse(text))
    if (!changed) return new Response(text, response)
    return new Response(JSON.stringify(payload), response)
  } catch {
    return new Response(text, response)
  }
}

export const anthropicProvider = createAnthropic({ baseURL, fetch: gatewayFetch })
