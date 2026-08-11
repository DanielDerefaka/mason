import { afterEach, describe, expect, it, vi } from 'vitest'

import { FALLBACK_FONT, primaryFamily, resolveFont } from './fonts'

/**
 * A design renders in the wrong typeface when the family named is one Google
 * does not host: the stylesheet 404s, the browser falls back, and nothing
 * anywhere reports it. It reads as the model being bad at identifying type,
 * when it was often right and simply named a commercial face.
 */
const serve = (ok: boolean) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: ok ? 200 : 400 })))

afterEach(() => vi.unstubAllGlobals())

describe('primaryFamily', () => {
  it.each([
    ['Inter, sans-serif', 'Inter'],
    ['"Playfair Display", serif', 'Playfair Display'],
    ["'Space Mono', monospace", 'Space Mono'],
    ['Inter', 'Inter'],
  ])('reads %s as %s', (input, expected) => {
    expect(primaryFamily(input)).toBe(expected)
  })
})

describe('resolveFont', () => {
  it('keeps a family Google hosts', async () => {
    serve(true)
    expect(await resolveFont('Inter')).toEqual({ family: 'Inter', substituted: false })
  })

  it.each([
    ['Söhne', 'Inter'],
    ['GT America', 'Archivo'],
    ['Canela', 'Playfair Display'],
    ['Futura', 'Jost'],
    ['Tiempos', 'Lora'],
  ])('maps the commercial face %s to %s without asking Google', async (face, expected) => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)

    expect(await resolveFont(face)).toEqual({ family: expected, substituted: true })
    expect(spy).not.toHaveBeenCalled()
  })

  it('substitutes within the category, never across it', async () => {
    // A geometric sans standing in for a transitional serif changes the design
    // far more than a near-miss inside the category ever does.
    expect((await resolveFont('Canela')).family).toBe('Playfair Display')
    expect((await resolveFont('Söhne')).family).toBe('Inter')
  })

  it('falls back when Google does not have the family', async () => {
    serve(false)
    expect(await resolveFont('Definitely Not A Font')).toEqual({
      family: FALLBACK_FONT,
      substituted: true,
    })
  })

  it('falls back on an empty answer', async () => {
    serve(true)
    expect((await resolveFont('')).family).toBe(FALLBACK_FONT)
    expect((await resolveFont(null)).family).toBe(FALLBACK_FONT)
  })

  it('reads a stack, since the model sometimes answers with one', async () => {
    serve(true)
    expect((await resolveFont('"Playfair Display", Georgia, serif')).family).toBe(
      'Playfair Display',
    )
  })

  it('keeps the family when Google is unreachable', async () => {
    // A network failure is not evidence the font is wrong, and swapping a
    // legitimate family because Google blipped is worse than letting it pass.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ENOTFOUND') }))

    expect(await resolveFont('Some New Family')).toEqual({
      family: 'Some New Family',
      substituted: false,
    })
  })

  it('matches a commercial face however it is cased', async () => {
    expect((await resolveFont('söhne')).family).toBe('Inter')
    expect((await resolveFont('HELVETICA NEUE')).family).toBe('Inter')
  })
})
