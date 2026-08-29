import { createAnthropic } from '@ai-sdk/anthropic'
import { APICallError, type LanguageModel } from 'ai'
import { ConvexError } from 'convex/values'

import { MODEL, UI_MODEL, anthropicProvider } from './anthropic'

/**
 * Bring your own key.
 *
 * A visitor on /try can paste their own Anthropic key and generate on their
 * own account. The key arrives in the `x-api-key` header, is used for exactly
 * one provider instance built inside the request, and is never stored, never
 * logged and never put on an error — `src/lib/sentry-options.ts` already
 * scrubs the header by name and the `sk-ant-` shape by pattern, and this file
 * takes care never to hand the key to anything that might print it.
 *
 * Direct to api.anthropic.com, always. The server's own provider may sit
 * behind a gateway (`ANTHROPIC_BASE_URL`) with a spoofed User-Agent, and a
 * visitor's key must not travel through either: they gave it to Anthropic,
 * not to whoever runs the gateway. So the base URL is explicit — left
 * undefined it would fall back to the env — and the fetch is the platform's
 * own, not `gatewayFetch`.
 */
const KEY_SHAPE = /^sk-ant-[A-Za-z0-9_-]{20,}$/

export const BYOK_HEADER = 'x-api-key'

/**
 * The workspace a visitor's key acts in, when their key needs one.
 *
 * Anthropic's identity-linked keys belong to a person rather than a workspace
 * and refuse every request that does not name one: 400 `invalid_request_error`,
 * "anthropic-workspace-id is required when authenticating with an
 * identity-linked API key". Nothing about the key's *shape* says which kind it
 * is, so this cannot be inferred — it is asked for, and only used when given.
 *
 * Sent under our own `x-` name rather than Anthropic's, so a request that
 * merely passes through here can never smuggle a header straight into the
 * upstream call.
 */
export const BYOK_WORKSPACE_HEADER = 'x-anthropic-workspace-id'

/** Ids are opaque (`wrkspc_…`); this only refuses what could not be one. */
const WORKSPACE_SHAPE = /^[A-Za-z0-9_-]{6,100}$/

export const readByokWorkspace = (request: Request): string | null => {
  const raw = request.headers.get(BYOK_WORKSPACE_HEADER)
  if (!raw) return null
  const id = raw.trim()
  return WORKSPACE_SHAPE.test(id) ? id : null
}

/**
 * Anthropic's own words for the one refusal a visitor can fix themselves.
 *
 * Matched on the message rather than the status because a 400 from Anthropic
 * covers everything from an empty balance to a malformed request, and only
 * this one has an answer the person who pasted the key can act on.
 */
const NEEDS_WORKSPACE = /anthropic-workspace-id is required/i

/**
 * The visitor's key, or null when there is not one worth trying.
 *
 * Refusing the server's own key is belt and braces: if it ever leaked into a
 * browser, sending it back here would give a visitor free generations on the
 * house account with `byok` set, which is exactly the charge the flag skips.
 */
export const readByokKey = (request: Request): string | null => {
  const raw = request.headers.get(BYOK_HEADER)
  if (!raw) return null
  const key = raw.trim()
  if (!KEY_SHAPE.test(key)) return null
  const own = process.env.ANTHROPIC_API_KEY
  if (own && key === own) return null
  return key
}

export type RequestModel = { model: LanguageModel; byok: boolean }

const modelFor = (request: Request, name: string): RequestModel => {
  const key = readByokKey(request)
  if (!key) return { model: anthropicProvider(name), byok: false }

  const workspace = readByokWorkspace(request)
  const provider = createAnthropic({
    apiKey: key,
    baseURL: 'https://api.anthropic.com/v1',
    fetch: globalThis.fetch,
    ...(workspace ? { headers: { 'anthropic-workspace-id': workspace } } : {}),
  })
  return { model: provider(name), byok: true }
}

/** The design-writing model, on the visitor's key when they sent one. */
export const modelForRequest = (request: Request) => modelFor(request, UI_MODEL)

/** The extraction model (style guides, flow plans), on the visitor's key when they sent one. */
export const modelForRequestText = (request: Request) => modelFor(request, MODEL)

/**
 * What Anthropic's refusal means to the person who pasted the key.
 *
 * The upstream body is not forwarded: it can quote the request, and the
 * request carried the key. Only the status and a sentence of ours go back.
 */
export const describeRefusal = (status: number, body = ''): string => {
  // Checked before the status cases: this arrives as a plain 400 and would
  // otherwise read "Anthropic refused the request (400)", which tells the
  // person holding the key nothing about the one thing they can do about it.
  if (NEEDS_WORKSPACE.test(body)) {
    return 'That key belongs to your Anthropic account rather than a workspace — add your workspace ID next to it, or use a key made inside a workspace'
  }
  if (status === 401) return 'Your Anthropic key was rejected'
  if (status === 403) return 'Your Anthropic key is not allowed to use this model'
  if (status === 402 || (status === 400 && /credit balance/i.test(body))) {
    return 'Your Anthropic account has no credit'
  }
  if (status === 404) return 'Your Anthropic account cannot use this model'
  if (status === 429) return 'Your Anthropic account is rate limited — try again in a moment'
  if (status === 529) return 'Anthropic is overloaded — try again in a moment'
  return `Anthropic refused the request (${status})`
}

export type GenerationFailure = { status: number; message: string }

/**
 * Logs a failed generation and decides what to tell the caller.
 *
 * Two behaviours in one place because they are two halves of the same rule.
 * On the house key the whole error is logged, as it always was — that is how
 * gateway bugs have been found. On a visitor's key the error object is never
 * printed: an `APICallError` carries the request headers, and the request
 * headers carry the key. Message and status are enough to diagnose, and they
 * are all that is logged.
 *
 * The status is Anthropic's own when the visitor's key was refused, so the
 * browser can tell a bad key (401) from an empty account (400) and act on
 * each; everything else stays the 500 it always was.
 */
/**
 * Whether a Convex mutation refused because there was nothing left to spend.
 *
 * Matched on the payload, not the message: production replaces the message of
 * anything but a ConvexError with "Server Error", so a string comparison here
 * would work in development and quietly stop working live.
 */
export const isOutOfCredits = (error: unknown) =>
  error instanceof ConvexError &&
  typeof error.data === 'object' &&
  error.data !== null &&
  (error.data as { code?: unknown }).code === 'OUT_OF_CREDITS'

export const describeGenerationFailure = (
  tag: string,
  error: unknown,
  request: Request,
  fallback: string,
): GenerationFailure => {
  const byok = readByokKey(request) !== null
  const upstream = APICallError.isInstance(error) ? error.statusCode : undefined

  // The balance is checked before the spend, so this is the race between two
  // tabs rather than the ordinary empty wallet — but it reached the browser as
  // a 500 saying "Server Error", which the client cannot act on. 402 is the
  // status the out-of-credits sheet listens for.
  if (isOutOfCredits(error)) return { status: 402, message: 'You are out of credits' }

  if (byok) {
    console.error(
      tag,
      JSON.stringify({
        byok: true,
        message: error instanceof Error ? error.message : String(error),
        statusCode: upstream ?? null,
      }),
    )
    if (upstream && upstream >= 400) {
      return {
        status: upstream,
        message: describeRefusal(upstream, APICallError.isInstance(error) ? error.responseBody : ''),
      }
    }
    return { status: 500, message: fallback }
  }

  console.error(tag, error)
  return { status: 500, message: error instanceof Error ? error.message : fallback }
}

/**
 * Waits for the model to start talking, and reports if it refused instead.
 *
 * `streamText` never throws for a rejected request: the refusal arrives as an
 * error part on the stream and `textStream` simply ends. A route that had
 * already sent its 200 and started streaming would then close an empty body,
 * and the browser would have no status to act on — a bad key would look like
 * an empty design. So the first part is awaited here, before any header has
 * gone out, on a tee of the full stream that is cancelled the moment it has
 * answered; the route's own `textStream` is untouched and loses nothing.
 *
 * Returns the error when the stream failed before producing any text, else
 * null. A stream that ends with no text and no error is not a failure here —
 * the routes already have a name for that (an empty generation) and a refund
 * to go with it.
 */
export const failedBeforeStreaming = async (
  fullStream: AsyncIterable<{ type: string; error?: unknown }>,
): Promise<unknown> => {
  const iterator = fullStream[Symbol.asyncIterator]()
  try {
    for (;;) {
      const { done, value } = await iterator.next()
      if (done) return null
      if (value.type === 'text-delta') return null
      if (value.type === 'error') return value.error ?? new Error('The model returned an error')
    }
  } catch (error) {
    return error
  } finally {
    await iterator.return?.().catch(() => undefined)
  }
}
