import { describe, expect, it } from 'vitest'

/**
 * Header values are ByteStrings: anything above 255 throws when it is set.
 *
 * Found in the running app's log, not by reading the code. A photographer
 * called Şeyma or Müller made the image route throw inside the redirect, drop
 * into its catch, and answer with a grey placeholder — so a design lost its
 * photograph because of how the photographer spells their name, and the only
 * evidence was a panel that looked like a stock miss.
 *
 * The implementation lives in the route, which cannot be imported in a test
 * environment without a request; this is the same transform, kept honest by
 * the assertion below that every result is byte-safe.
 */
const headerSafe = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, (char) => encodeURIComponent(char))
    .trim() || 'Pexels photographer'

/** What the browser does when a header is set: throws above 255. */
const isByteSafe = (value: string) => [...value].every((char) => char.charCodeAt(0) <= 255)

describe('headerSafe', () => {
  it.each([
    'Şeyma Yıldız',
    'Müller',
    'José González',
    'Ana María Ñuñez',
    'Kraków Straße',
    '陈伟',
    'Дмитрий',
    'Пётр Ильич',
  ])('makes %s safe to send as a header', (name) => {
    expect(isByteSafe(headerSafe(name))).toBe(true)
  })

  it('folds accents to the base letter so the name stays readable', () => {
    expect(headerSafe('José González')).toBe('Jose Gonzalez')
    expect(headerSafe('Müller')).toBe('Muller')
  })

  it('keeps a plain ASCII name exactly as it is', () => {
    expect(headerSafe('Pavel Danilyuk')).toBe('Pavel Danilyuk')
  })

  it('percent-encodes another script rather than deleting it', () => {
    // Deleting would leave an empty credit for a real photographer; encoded,
    // the name is still recoverable by whoever reads the header.
    const encoded = headerSafe('陈伟')
    expect(encoded).not.toBe('')
    expect(decodeURIComponent(encoded)).toBe('陈伟')
  })

  it('falls back rather than returning an empty credit', () => {
    expect(headerSafe('   ')).toBe('Pexels photographer')
  })

  it('leaves a URL usable', () => {
    expect(headerSafe('https://www.pexels.com/@p123')).toBe('https://www.pexels.com/@p123')
  })
})
