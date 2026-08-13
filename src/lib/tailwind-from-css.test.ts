import { describe, expect, it } from 'vitest'

import { parseDeclarations, toTailwind } from './tailwind-from-css'

/**
 * The translation is only worth doing if it is not lossy, so these are mostly
 * tests that it refuses to approximate: a measurement that is not on the scale
 * keeps its number, and a declaration with no utility at all survives into the
 * style prop rather than being quietly dropped.
 */
const classes = (style: string) => toTailwind(parseDeclarations(style)).classes.join(' ')
const leftover = (style: string) => toTailwind(parseDeclarations(style)).leftover

describe('parseDeclarations', () => {
  it('splits on semicolons that are not inside a function', () => {
    expect(parseDeclarations('color: red; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4)')).toEqual({
      color: 'red',
      'box-shadow': '0 1px 2px rgba(0, 0, 0, 0.4)',
    })
  })

  it('survives a trailing semicolon and stray whitespace', () => {
    expect(parseDeclarations('  padding : 4px ;  ')).toEqual({ padding: '4px' })
  })
})

describe('the scale', () => {
  it('uses a utility only where it means exactly the same thing', () => {
    // p-6 *is* 24px. Anything else keeps its measurement rather than being
    // rounded to the nearest step, which is how a translation stops being one.
    expect(classes('padding: 24px')).toBe('p-6')
    expect(classes('padding: 26px')).toBe('p-[26px]')
  })

  it('reads rem against the same scale', () => {
    expect(classes('padding: 1.5rem')).toBe('p-6')
  })

  it('names a font size only on an exact match', () => {
    expect(classes('font-size: 14px')).toBe('text-sm')
    expect(classes('font-size: 56px')).toBe('text-[56px]')
  })

  it('keeps a radius exact, and names the two that are not measurements', () => {
    expect(classes('border-radius: 12px')).toBe('rounded-xl')
    expect(classes('border-radius: 26px')).toBe('rounded-[26px]')
    expect(classes('border-radius: 9999px')).toBe('rounded-full')
    expect(classes('border-radius: 0')).toBe('rounded-none')
  })
})

describe('shorthands', () => {
  it('expands a multi-value padding and folds it back into axes', () => {
    // `p-[0_48px_96px]` is valid and unreadable; these are the three classes
    // somebody would have written.
    expect(classes('padding: 0 48px 96px')).toBe('pt-0 pb-24 px-12')
  })

  it('collapses four equal sides, which is how the editor writes padding', () => {
    expect(
      classes('padding-top: 24px; padding-right: 24px; padding-bottom: 24px; padding-left: 24px'),
    ).toBe('p-6')
  })

  it('splits a border into the width, style and colour it really is', () => {
    expect(classes('border: 1px solid #ff0000')).toBe('border border-[#ff0000]')
  })

  it('keeps a border style that is not the default', () => {
    expect(classes('border: 2px dashed #ff0000')).toBe(
      'border-[2px] border-dashed border-[#ff0000]',
    )
  })

  it('reads one side of a border', () => {
    expect(classes('border-bottom: 1px solid #000000')).toBe('border-b border-b-[#000000]')
  })
})

describe('custom properties', () => {
  it('hints the type, because Tailwind emits nothing for an ambiguous value', () => {
    // text-[var(--x)] could be a colour or a font size; faced with the
    // ambiguity Tailwind produces no rule at all and nothing says why.
    expect(classes('color: var(--foreground)')).toBe('text-[color:var(--foreground)]')
    expect(classes('background-color: var(--primary)')).toBe('bg-[color:var(--primary)]')
    expect(classes('font-family: var(--font-family)')).toBe('font-[family-name:var(--font-family)]')
  })

  it('leaves a plain colour unhinted, where there is nothing to resolve', () => {
    expect(classes('color: #ffffff')).toBe('text-[#ffffff]')
  })
})

describe('values with spaces', () => {
  it('joins them with underscores, which is the arbitrary-value syntax', () => {
    expect(classes('box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4)')).toBe(
      'shadow-[0_1px_2px_rgba(0,_0,_0,_0.4)]',
    )
  })

  it('reads a repeated grid as a column count', () => {
    expect(classes('grid-template-columns: repeat(3, 1fr)')).toBe('grid-cols-3')
    expect(classes('grid-template-columns: 1fr 1fr')).toBe('grid-cols-2')
    expect(classes('grid-template-columns: 240px 1fr')).toBe('grid-cols-[240px_1fr]')
  })
})

describe('what has no utility', () => {
  it('keeps rendering from a style prop rather than disappearing', () => {
    expect(leftover('transition: all 0.2s ease')).toEqual({ transition: 'all 0.2s ease' })
    expect(classes('transition: all 0.2s ease')).toBe('')
  })

  it('drops a declaration that says nothing', () => {
    // Solid is Tailwind's default, and `background-image: none` is the absence
    // of a background image. Neither needs a class or a style prop.
    expect(classes('border-style: solid')).toBe('')
    expect(leftover('border-style: solid')).toEqual({})
    expect(classes('background-image: none')).toBe('')
    expect(leftover('background-image: none')).toEqual({})
  })
})

describe('keywords', () => {
  it.each([
    ['display: flex', 'flex'],
    ['display: none', 'hidden'],
    ['flex-direction: column', 'flex-col'],
    ['align-items: flex-start', 'items-start'],
    ['justify-content: space-between', 'justify-between'],
    ['position: absolute', 'absolute'],
    ['object-fit: cover', 'object-cover'],
    ['text-decoration-line: none', 'no-underline'],
    ['font-weight: 600', 'font-semibold'],
    ['width: 100%', 'w-full'],
    ['width: 50%', 'w-1/2'],
    ['height: auto', 'h-auto'],
    ['margin: auto', 'm-auto'],
    ['opacity: 0.5', 'opacity-50'],
    ['flex-grow: 1', 'grow'],
  ])('reads %s', (declaration, expected) => {
    expect(classes(declaration)).toBe(expected)
  })
})
