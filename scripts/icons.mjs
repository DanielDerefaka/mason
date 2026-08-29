/**
 * Regenerates the raster icons from `src/app/icon.svg`, which is the mark.
 *
 *   npm run icons
 *
 * Why this exists: the mark went into `app/icon.svg` and `app/favicon.ico`
 * stayed create-next-app's — a white triangle in a black circle — for three
 * weeks, and Google's favicon picker takes the .ico over the SVG, so the
 * brand results wore the starter's icon. Nobody opens a .ico, so nothing
 * noticed. The SVG is the only artwork now; the .ico and the apple icon are
 * derived from it here, and `src/app/icons.test.ts` fails if either drifts.
 *
 * favicon.ico carries 16, 32 and 48 — Google wants a layer of at least 48 —
 * as 32-bit BMPs with the 1-bit AND mask that pre-alpha renderers still read.
 * apple-icon.png is 180 and square to the edge: iOS and iMessage lay their own
 * rounded mask over it and paint black under any transparency, so the SVG's
 * corner radius comes off for that one file and the device rounds it instead.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import sharp from 'sharp'

const APP = join(process.cwd(), 'src/app')
const SVG = readFileSync(join(APP, 'icon.svg'), 'utf8')
const ICO_SIZES = [16, 32, 48]
const APPLE_SIZE = 180

/** The mark at `size`: straight-alpha RGBA, top row first. */
const render = (size, svg = SVG) =>
  sharp(Buffer.from(svg)).resize(size, size, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer()

/** One .ico image: BITMAPINFOHEADER, BGRA rows bottom-up, then the AND mask. */
const bmp = (rgba, size) => {
  const stride = size * 4
  const maskStride = Math.ceil(size / 32) * 4
  const header = Buffer.alloc(40)
  header.writeUInt32LE(40, 0)
  header.writeInt32LE(size, 4)
  header.writeInt32LE(size * 2, 8) // the height counts the mask
  header.writeUInt16LE(1, 12)
  header.writeUInt16LE(32, 14)
  header.writeUInt32LE(stride * size + maskStride * size, 20)
  const pixels = Buffer.alloc(stride * size)
  const mask = Buffer.alloc(maskStride * size)
  for (let row = 0; row < size; row++) {
    const source = (size - 1 - row) * stride
    for (let x = 0; x < size; x++) {
      const i = source + x * 4
      const o = row * stride + x * 4
      pixels[o] = rgba[i + 2]
      pixels[o + 1] = rgba[i + 1]
      pixels[o + 2] = rgba[i]
      pixels[o + 3] = rgba[i + 3]
      if (rgba[i + 3] === 0) mask[row * maskStride + (x >> 3)] |= 0x80 >> (x & 7)
    }
  }
  return Buffer.concat([header, pixels, mask])
}

/** ICONDIR, one ICONDIRENTRY per layer, then the layers in order. */
const ico = (layers) => {
  const directory = Buffer.alloc(6 + 16 * layers.length)
  directory.writeUInt16LE(1, 2)
  directory.writeUInt16LE(layers.length, 4)
  let offset = directory.length
  layers.forEach(({ size, data }, index) => {
    const entry = 6 + 16 * index
    directory[entry] = size
    directory[entry + 1] = size
    directory.writeUInt16LE(1, entry + 4)
    directory.writeUInt16LE(32, entry + 6)
    directory.writeUInt32LE(data.length, entry + 8)
    directory.writeUInt32LE(offset, entry + 12)
    offset += data.length
  })
  return Buffer.concat([directory, ...layers.map((layer) => layer.data)])
}

const layers = await Promise.all(
  ICO_SIZES.map(async (size) => ({ size, data: bmp(await render(size), size) })),
)
writeFileSync(join(APP, 'favicon.ico'), ico(layers))

const square = SVG.replace(/ rx="\d+"/, '')
if (square === SVG) throw new Error('icon.svg has no rounded rect to square off for the apple icon')
const apple = await sharp(Buffer.from(square))
  .resize(APPLE_SIZE, APPLE_SIZE, { kernel: 'lanczos3' })
  .png({ compressionLevel: 9 })
  .toBuffer()
writeFileSync(join(APP, 'apple-icon.png'), apple)

console.log(`favicon.ico: ${ICO_SIZES.map((size) => `${size}×${size}`).join(', ')} · apple-icon.png: ${APPLE_SIZE}×${APPLE_SIZE}`)
