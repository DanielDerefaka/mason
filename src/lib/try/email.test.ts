import { describe, expect, it } from 'vitest'

import { looksLikeEmail, normaliseEmail } from './email'

describe('normalising an address', () => {
  it('trims and lower-cases, so the same person is one row', () => {
    expect(normaliseEmail('  Someone@Example.COM ')).toBe('someone@example.com')
  })

  it('leaves an already-normal address alone', () => {
    expect(normaliseEmail('someone@example.com')).toBe('someone@example.com')
  })
})

describe('what counts as an address at the export gate', () => {
  it.each([
    'someone@example.com',
    'first.last@sub.example.co.uk',
    'someone+mason@example.com',
    "o'brien@example.ie",
  ])('accepts %s', (value) => {
    expect(looksLikeEmail(value)).toBe(true)
  })

  it.each([
    ['nothing', ''],
    ['whitespace', '   '],
    ['no at sign', 'someone.example.com'],
    ['no domain', 'someone@'],
    ['no local part', '@example.com'],
    ['no dot in the domain', 'someone@example'],
    ['a space inside', 'some one@example.com'],
    ['two at signs', 'someone@@example.com'],
    ['a trailing dot', 'someone@example.'],
  ])('refuses %s', (_label, value) => {
    expect(looksLikeEmail(value)).toBe(false)
  })

  it('refuses one longer than an address can be', () => {
    expect(looksLikeEmail(`${'a'.repeat(250)}@example.com`)).toBe(false)
  })

  it('accepts what it will store, not what it was handed', () => {
    // The regression this guards: a validator that ran before normalisation
    // refused every address a paste brought a capital or a space into.
    expect(looksLikeEmail('  Someone@Example.com  ')).toBe(true)
  })
})
