/**
 * A zip file, written by hand.
 *
 * An exported project is a directory, and a browser can only hand over one
 * file. Nothing else here needs archiving, so this is the whole format rather
 * than a dependency: local headers, a central directory and the end record.
 *
 * Entries are stored rather than deflated. A project is a few dozen small text
 * files, the difference is tens of kilobytes, and `CompressionStream` would
 * make the whole call asynchronous to save them. Stored entries are read by
 * every unzip tool there is, which is the property that actually matters for
 * something a person downloads and opens.
 */

export type ZipEntry = { path: string; content: string }

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

export const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * A fixed timestamp rather than the clock.
 *
 * Exporting the same design twice should produce the same bytes — it makes the
 * output diffable and the tests decidable. 1980-01-01 is the earliest a DOS
 * timestamp can express, which is the usual convention for "no meaningful
 * time".
 */
const DOS_TIME = 0
const DOS_DATE = 0x0021

const utf8 = (text: string) => new TextEncoder().encode(text)

/** Little-endian writes, which is the only byte order the format uses. */
class Buffer {
  private parts: Uint8Array[] = []
  length = 0

  bytes(value: Uint8Array) {
    this.parts.push(value)
    this.length += value.length
  }

  short(value: number) {
    const part = new Uint8Array(2)
    new DataView(part.buffer).setUint16(0, value, true)
    this.bytes(part)
  }

  long(value: number) {
    const part = new Uint8Array(4)
    new DataView(part.buffer).setUint32(0, value >>> 0, true)
    this.bytes(part)
  }

  join(): Uint8Array<ArrayBuffer> {
    const out = new Uint8Array(new ArrayBuffer(this.length))
    let offset = 0
    for (const part of this.parts) {
      out.set(part, offset)
      offset += part.length
    }
    return out
  }
}

const LOCAL_HEADER = 0x04034b50
const CENTRAL_HEADER = 0x02014b50
const END_RECORD = 0x06054b50
/** Bit 11: the names in this archive are UTF-8. */
const UTF8_FLAG = 0x0800

export const zip = (entries: ZipEntry[]): Uint8Array<ArrayBuffer> => {
  const body = new Buffer()
  const directory = new Buffer()
  let offset = 0

  for (const entry of entries) {
    const name = utf8(entry.path)
    const content = utf8(entry.content)
    const checksum = crc32(content)

    body.long(LOCAL_HEADER)
    body.short(20) // version needed
    body.short(UTF8_FLAG)
    body.short(0) // stored
    body.short(DOS_TIME)
    body.short(DOS_DATE)
    body.long(checksum)
    body.long(content.length) // compressed
    body.long(content.length) // uncompressed
    body.short(name.length)
    body.short(0) // extra field
    body.bytes(name)
    body.bytes(content)

    directory.long(CENTRAL_HEADER)
    directory.short(20) // version made by
    directory.short(20) // version needed
    directory.short(UTF8_FLAG)
    directory.short(0)
    directory.short(DOS_TIME)
    directory.short(DOS_DATE)
    directory.long(checksum)
    directory.long(content.length)
    directory.long(content.length)
    directory.short(name.length)
    directory.short(0) // extra
    directory.short(0) // comment
    directory.short(0) // disk number
    directory.short(0) // internal attributes
    directory.long(0) // external attributes
    directory.long(offset)
    directory.bytes(name)

    offset = body.length
  }

  const end = new Buffer()
  end.long(END_RECORD)
  end.short(0) // this disk
  end.short(0) // disk with the directory
  end.short(entries.length)
  end.short(entries.length)
  end.long(directory.length)
  end.long(body.length)
  end.short(0) // comment length

  // Backed by a plain ArrayBuffer, which is what a Blob will take: a
  // Uint8Array is allowed to be a view onto a SharedArrayBuffer and the two
  // are not interchangeable to the type system.
  const out = new Uint8Array(new ArrayBuffer(body.length + directory.length + end.length))
  out.set(body.join(), 0)
  out.set(directory.join(), body.length)
  out.set(end.join(), body.length + directory.length)
  return out
}
