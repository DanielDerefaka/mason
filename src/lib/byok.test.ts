import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * A visitor's key must reach Anthropic and nothing else, and the server's own
 * key must never be accepted as though a visitor had supplied it. Written as
 * the mistakes that would leak a key or hand out free generations.
 */
const created: Array<Record<string, unknown>> = []

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: (options: Record<string, unknown>) => {
    created.push(options)
    return (name: string) => ({ provider: 'byok', modelId: name })
  },
}))

vi.mock('./anthropic', () => ({
  MODEL: 'text-model',
  UI_MODEL: 'ui-model',
  anthropicProvider: (name: string) => ({ provider: 'house', modelId: name }),
}))

const { APICallError } = await import('ai')
const { ConvexError } = await import('convex/values')
const {
  describeGenerationFailure,
  isOutOfCredits,
  describeRefusal,
  failedBeforeStreaming,
  modelForRequest,
  modelForRequestText,
  readByokKey,
  readByokWorkspace,
} = await import('./byok')

const GOOD_KEY = 'sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

const WORKSPACE = 'wrkspc_01ABCDEFGHIJKLMNOP'

const request = (key?: string, workspace?: string) =>
  new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: {
      ...(key === undefined ? {} : { 'x-api-key': key }),
      ...(workspace === undefined ? {} : { 'x-anthropic-workspace-id': workspace }),
    },
  })

afterEach(() => {
  created.length = 0
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('reading the key', () => {
  it('accepts a well-formed Anthropic key', () => {
    expect(readByokKey(request(GOOD_KEY))).toBe(GOOD_KEY)
  })

  it('trims the whitespace a paste brings with it', () => {
    expect(readByokKey(request(`  ${GOOD_KEY}\t`))).toBe(GOOD_KEY)
  })

  it.each([
    ['nothing', ''],
    ['whitespace', '   '],
    ['an OpenAI-shaped key', 'sk-proj-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
    ['a gateway key', 'sk-KRg9AAAAAAAAAAAAAAAAAAAAAAAA'],
    ['a key that is too short', 'sk-ant-short'],
    ['a key with characters outside the alphabet', 'sk-ant-api03-AAAA AAAA/AAAAAAAAAAAAAAAAAAAAA'],
  ])('rejects %s', (_label, key) => {
    expect(readByokKey(request(key))).toBeNull()
  })

  it('rejects a request with no header at all', () => {
    expect(readByokKey(request())).toBeNull()
  })

  it("rejects the server's own key, so a leaked key cannot buy free generations", () => {
    vi.stubEnv('ANTHROPIC_API_KEY', GOOD_KEY)
    expect(readByokKey(request(GOOD_KEY))).toBeNull()
  })
})

/**
 * Anthropic's identity-linked keys belong to a person rather than a workspace
 * and refuse every request that does not name one — a plain 400 whose message
 * is the only thing that distinguishes it from an empty balance. Nothing in
 * the key's shape says which kind it is, so it is asked for and passed on.
 */
describe('reading the workspace', () => {
  it('accepts an id that could be one', () => {
    expect(readByokWorkspace(request(GOOD_KEY, WORKSPACE))).toBe(WORKSPACE)
  })

  it('trims what a paste brings with it', () => {
    expect(readByokWorkspace(request(GOOD_KEY, `  ${WORKSPACE} `))).toBe(WORKSPACE)
  })

  it.each([
    ['nothing', ''],
    ['whitespace', '   '],
    ['something too short to be an id', 'abc'],
    ['a header smuggling a second one', `${WORKSPACE}\u0009x`],
    ['a header with a space in it', 'wrkspc 01ABCDEF'],
  ])('refuses %s', (_label, id) => {
    expect(readByokWorkspace(request(GOOD_KEY, id))).toBeNull()
  })

  it('is absent when the visitor did not send one', () => {
    expect(readByokWorkspace(request(GOOD_KEY))).toBeNull()
  })
})

describe('choosing a model', () => {
  it('uses the house provider when no key was sent', () => {
    expect(modelForRequest(request())).toEqual({
      model: { provider: 'house', modelId: 'ui-model' },
      byok: false,
    })
    expect(created).toHaveLength(0)
  })

  it('builds a fresh provider on the visitor key, direct to Anthropic, with a plain fetch', () => {
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://gateway.example')
    const { model, byok } = modelForRequest(request(GOOD_KEY))

    expect(byok).toBe(true)
    expect(model).toEqual({ provider: 'byok', modelId: 'ui-model' })
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({
      apiKey: GOOD_KEY,
      // Explicit, because undefined would fall back to the gateway in the env.
      baseURL: 'https://api.anthropic.com/v1',
      fetch: globalThis.fetch,
    })
  })

  it('passes the workspace on under the name Anthropic wants', () => {
    modelForRequest(request(GOOD_KEY, WORKSPACE))
    expect(created[0]).toMatchObject({
      headers: { 'anthropic-workspace-id': WORKSPACE },
    })
  })

  it('sends no workspace header at all when there is nothing to send', () => {
    // An empty or invented value is worse than none: a key that does not need
    // a workspace is refused outright when handed the wrong one.
    modelForRequest(request(GOOD_KEY))
    expect(created[0]).not.toHaveProperty('headers')
  })

  it('keeps the extraction model for the routes that use it', () => {
    expect(modelForRequestText(request(GOOD_KEY)).model).toEqual({
      provider: 'byok',
      modelId: 'text-model',
    })
    expect(modelForRequestText(request()).model).toEqual({
      provider: 'house',
      modelId: 'text-model',
    })
  })
})

describe('explaining a refusal', () => {
  it.each([
    [401, '', 'Your Anthropic key was rejected'],
    [400, '{"error":{"message":"Your credit balance is too low"}}', 'Your Anthropic account has no credit'],
    [429, '', 'Your Anthropic account is rate limited — try again in a moment'],
    [529, '', 'Anthropic is overloaded — try again in a moment'],
  ])('turns a %s into a sentence', (status, body, message) => {
    expect(describeRefusal(status, body)).toBe(message)
  })

  /**
   * The regression this exists for: pasting an identity-linked key produced
   * "Anthropic refused the request (400)", which names neither the problem
   * nor the one thing the person holding the key can do about it.
   */
  it('names the workspace an identity-linked key is missing', () => {
    const body =
      '{"type":"error","error":{"type":"invalid_request_error","message":"anthropic-workspace-id is required when authenticating with an identity-linked API key; send the id of the workspace this request acts in."}}'
    expect(describeRefusal(400, body)).toMatch(/workspace ID/)
  })

  it('does not read every 400 as a missing workspace', () => {
    expect(describeRefusal(400, '{"error":{"message":"messages: at least one required"}}')).toBe(
      'Anthropic refused the request (400)',
    )
  })
})

describe('reporting a failed generation', () => {
  const apiError = (statusCode: number) =>
    new APICallError({
      message: 'invalid x-api-key',
      url: 'https://api.anthropic.com/v1/messages',
      requestBodyValues: {},
      statusCode,
      responseHeaders: { 'x-api-key': GOOD_KEY },
      responseBody: `{"error":"bad key ${GOOD_KEY}"}`,
    })

  it('returns the upstream status on a visitor key, so the browser can act on a bad key', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(describeGenerationFailure('[t]', apiError(401), request(GOOD_KEY), 'fallback')).toEqual({
      status: 401,
      message: 'Your Anthropic key was rejected',
    })
  })

  it('never prints the error object on a visitor key, because it carries the key', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    describeGenerationFailure('[t]', apiError(401), request(GOOD_KEY), 'fallback')

    expect(log).toHaveBeenCalledTimes(1)
    const printed = log.mock.calls[0].map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
    expect(printed.join(' ')).not.toContain(GOOD_KEY)
    expect(printed.join(' ')).toContain('401')
  })

  it('keeps the whole error and a 500 on the house key, as it always did', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = new Error('gateway exploded')
    expect(describeGenerationFailure('[t]', error, request(), 'fallback')).toEqual({
      status: 500,
      message: 'gateway exploded',
    })
    expect(log).toHaveBeenCalledWith('[t]', error)
  })

  it('does not turn a non-HTTP failure on a visitor key into a fake status', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(describeGenerationFailure('[t]', new Error('boom'), request(GOOD_KEY), 'fallback')).toEqual({
      status: 500,
      message: 'fallback',
    })
  })

  /**
   * The regression this exists for: a spend that lost the race between two
   * tabs threw out of Convex and came back as a 500 reading "Server Error" in
   * production, so the browser showed a generic failure instead of the
   * out-of-credits sheet, which listens for 402. Matched on the ConvexError
   * payload because production redacts every other error's message.
   */
  it('answers 402 when the spend refused for want of credits', () => {
    const error = new ConvexError({ code: 'OUT_OF_CREDITS' })
    expect(describeGenerationFailure('[t]', error, request(), 'fallback')).toEqual({
      status: 402,
      message: 'You are out of credits',
    })
    // Even on a visitor's own key, where the branch below would have swallowed
    // it into a 500 with the fallback text.
    expect(describeGenerationFailure('[t]', error, request(GOOD_KEY), 'fallback')).toEqual({
      status: 402,
      message: 'You are out of credits',
    })
  })

  it('does not mistake another ConvexError for an empty wallet', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(isOutOfCredits(new ConvexError({ code: 'SOMETHING_ELSE' }))).toBe(false)
    expect(isOutOfCredits(new ConvexError('OUT_OF_CREDITS'))).toBe(false)
    expect(isOutOfCredits(new Error('Out of credits'))).toBe(false)
  })
})

describe('waiting for the first chunk', () => {
  const parts = (...items: Array<{ type: string; error?: unknown }>) => ({
    async *[Symbol.asyncIterator]() {
      for (const item of items) yield item
    },
  })

  it('reports the error when the model refused before saying anything', async () => {
    const refusal = new Error('401')
    expect(
      await failedBeforeStreaming(parts({ type: 'start' }, { type: 'error', error: refusal })),
    ).toBe(refusal)
  })

  it('answers null as soon as text starts, without reading the rest', async () => {
    let read = 0
    const stream = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'start' }
        read += 1
        yield { type: 'text-delta' }
        read += 1
        yield { type: 'error', error: new Error('later') }
        read += 1
      },
    }
    expect(await failedBeforeStreaming(stream)).toBeNull()
    expect(read).toBe(1)
  })

  it('treats an empty stream as not-a-refusal, since the routes already handle empty', async () => {
    expect(await failedBeforeStreaming(parts({ type: 'start' }, { type: 'finish' }))).toBeNull()
  })
})
