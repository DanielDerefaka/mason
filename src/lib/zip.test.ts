import { describe, expect, it } from 'vitest'

import { crc32, zip } from './zip'

/**
 * A zip nobody can open is a download that wastes somebody's afternoon, and
 * the failure is silent from in here — the bytes are written either way. These
 * check the structure against the format rather than against our own reader.
 */
const read = (bytes: Uint8Array, offset: number, length: number) =>
  new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true) &
  (length === 2 ? 0xffff : 0xffffffff)

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

describe('crc32', () => {
  it('matches the published checksum for the standard check value', () => {
    // The IEEE CRC-32 of "123456789" is 0xCBF43926 by definition; getting this
    // wrong produces an archive that opens and then reports corruption.
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('is zero for nothing at all', () => {
    expect(crc32(new Uint8Array())).toBe(0)
  })
})

describe('zip', () => {
  const archive = zip([
    { path: 'package.json', content: '{}' },
    { path: 'app/page.tsx', content: 'export default () => null\n' },
  ])

  it('starts with a local file header', () => {
    expect(read(archive, 0, 4)).toBe(0x04034b50)
  })

  it('ends with the end-of-directory record, naming every entry', () => {
    const end = archive.length - 22
    expect(read(archive, end, 4)).toBe(0x06054b50)
    expect(read(archive, end + 8, 2) & 0xffff).toBe(2)
    expect(read(archive, end + 10, 2) & 0xffff).toBe(2)
  })

  it('keeps the paths, so the directories survive the round trip', () => {
    expect(text(archive)).toContain('app/page.tsx')
    expect(text(archive)).toContain('package.json')
  })

  it('stores the content uncompressed, and says so', () => {
    // Method 0 at offset 8 of the local header.
    expect(read(archive, 8, 2) & 0xffff).toBe(0)
    expect(text(archive)).toContain('export default () => null')
  })

  it('flags the names as UTF-8, or a non-ASCII path arrives mangled', () => {
    expect(read(archive, 6, 2) & 0xffff).toBe(0x0800)
  })

  it('is byte-identical between two exports of the same design', () => {
    // Nothing reads the clock, so a re-export is diffable against the last one.
    expect(zip([{ path: 'a.txt', content: 'a' }])).toEqual(
      zip([{ path: 'a.txt', content: 'a' }]),
    )
  })

  it('writes an empty archive rather than throwing', () => {
    expect(read(zip([]), 0, 4)).toBe(0x06054b50)
  })
})
