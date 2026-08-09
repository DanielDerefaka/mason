import { createAnthropic } from '@ai-sdk/anthropic'
import Anthropic from '@anthropic-ai/sdk'

/**
 * Some Anthropic-compatible gateways only answer requests whose User-Agent
 * looks like Claude Code, and return 401 `unauthorized_client_error` otherwise.
 * agentrouter.org is one of them. Left unset — the case for the first-party
 * API — the SDK sends its own agent.
 */
const clientUserAgent = process.env.ANTHROPIC_CLIENT_UA

const headers = clientUserAgent ? { 'User-Agent': clientUserAgent } : undefined

/**
 * The SDK reads ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL from the environment,
 * so pointing the app at a different gateway is a config change, not a code
 * change. Unset base URL means api.anthropic.com.
 */
export const anthropic = new Anthropic({ defaultHeaders: headers })

export const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-5'

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
 * The AI SDK stamps its own `user-agent` after merging the `headers` option, so
 * passing one there is silently overwritten. Rewriting the header on the way
 * out is the only place the override survives.
 */
const gatewayFetch: typeof fetch = (input, init) => {
  const merged = new Headers(init?.headers)
  merged.set('User-Agent', clientUserAgent as string)
  return fetch(input, { ...init, headers: merged })
}

export const anthropicProvider = createAnthropic({
  baseURL,
  ...(clientUserAgent ? { fetch: gatewayFetch } : {}),
})
