import { describe, expect, it } from 'vitest'

import type { Shape } from '@/redux/slice/shapes'

import {
  describeFrame,
  frameContents,
  frameSizeOf,
  MANIFEST_MAX_CHARS,
  MAX_ARROWS,
  MAX_ELEMENTS,
} from './frame-manifest'

/**
 * What the model used to be told about a sketch: one PNG of purple blocks and
 * a sentence. A card holding two boxes was one slab, an outlined field beside
 * a filled button were two blocks of the same purple, an arrow had no head,
 * and a 40/55 split was "two columns, roughly". The manifest is the shape data
 * put into words, and these fixtures pin the words.
 */

/** The Desktop preset, placed away from the origin so translation is exercised. */
const FRAME: Shape = {
  id: 'frame',
  kind: 'frame',
  x: 100,
  y: 200,
  width: 1440,
  height: 1024,
  fill: 'transparent',
  label: 'Desktop',
}

const box = (id: string, x: number, y: number, width: number, height: number, extra: Partial<Shape> = {}): Shape => ({
  id,
  kind: 'rectangle',
  x: FRAME.x + x,
  y: FRAME.y + y,
  width,
  height,
  fill: '#7C6BFF',
  ...extra,
})

const text = (id: string, label: string, x: number, y: number, width: number, height: number, extra: Partial<Shape> = {}): Shape => ({
  id,
  kind: 'text',
  x: FRAME.x + x,
  y: FRAME.y + y,
  width,
  height,
  fill: 'transparent',
  label,
  ...extra,
})

const arrow = (id: string, from: [number, number], to: [number, number]): Shape => ({
  id,
  kind: 'arrow',
  x: FRAME.x + Math.min(from[0], to[0]),
  y: FRAME.y + Math.min(from[1], to[1]),
  width: Math.abs(to[0] - from[0]),
  height: Math.abs(to[1] - from[1]),
  fill: '#FFFFFF',
  points: [
    { x: FRAME.x + from[0], y: FRAME.y + from[1] },
    { x: FRAME.x + to[0], y: FRAME.y + to[1] },
  ],
})

/**
 * A landing page: a top bar holding a wordmark and a pill button, a headline
 * over an outlined field and a filled button on the left, a card holding two
 * boxes on the right, and an arrow from the button into the card.
 */
const LANDING: Shape[] = [
  FRAME,
  box('bar', 0, 0, 1440, 64),
  text('wordmark', 'Acme Ledger', 29, 10, 160, 24, { text: { fontSize: 20, fontWeight: 700 } }),
  box('pill', 1210, 10, 200, 44, { style: { radius: 22 } }),
  text('headline', 'Invoices that reconcile themselves', 115, 184, 547, 116, {
    text: { fontSize: 48, fontWeight: 700 },
  }),
  box('field', 115, 348, 317, 51, { fill: 'transparent', style: { strokeWidth: 2 } }),
  box('button', 461, 348, 173, 51),
  box('card', 749, 143, 590, 737),
  box('card-top', 792, 184, 518, 82),
  box('card-body', 792, 307, 518, 389),
  arrow('cta', [600, 373], [760, 400]),
]

describe('describeFrame', () => {
  it('writes the landing page fixture line for line', () => {
    // The text lines carry an h since 2026-09-03. They did not, as if a text
    // box had no height, and a two-line headline came back as five lines at
    // 120px because nothing said how tall its block was.
    expect(describeFrame(FRAME, LANDING)).toBe(
      [
        'Frame 1440×1024, landscape. 9 elements, top to bottom, left to right; 1 arrow. Positions and sizes are percentages of the frame.',
        '',
        '1. box, x0 y0 w100 h6 — full width along the top edge (a bar). Contains 2, 3.',
        '2. text "Acme Ledger", x2 y1 w11 h2, 20px bold. Inside 1.',
        '3. box, x84 y1 w14 h4, pill — small and wide. Inside 1, beside 2.',
        '4. box, x52 y14 w41 h72 — the largest box. Contains 6, 7.',
        '5. text "Invoices that reconcile themselves", x8 y18 w38 h11, 48px bold — the largest text.',
        '6. box, x55 y18 w36 h8 — wide and thin. Inside 4.',
        '7. box, x55 y30 w36 h38. Inside 4, below 6.',
        '8. box, x8 y34 w22 h5, outlined — wide and thin.',
        '9. box, x32 y34 w12 h5, filled — small; beside 8, same row.',
        'Arrow from 9 to 4.',
        '',
        'Rows: [2, 3] inside 1; [8, 9]. Columns: left [5, 8, 9] spanning x8–46; right [4] spanning x52–93. Marks: 3 is a pill; 8 is outlined while the other boxes are filled.',
      ].join('\n'),
    )
  })

  it('is a pure function of the shapes: the same sketch in another paint order reads the same', () => {
    // Paint order only breaks ties, and the fixture has none.
    const reversed = [...LANDING].reverse()
    expect(describeFrame(FRAME, reversed)).toBe(describeFrame(FRAME, LANDING))
  })

  it('numbers top to bottom, then left to right, in the percentages it prints', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      box('lower-left', 100, 600, 200, 100),
      box('upper-right', 1000, 100, 200, 100),
      box('upper-left', 100, 100, 200, 100),
    ])
    expect(manifest).toContain('1. box, x7 y10 w14 h10')
    expect(manifest).toContain('2. box, x69 y10 w14 h10')
    expect(manifest).toContain('3. box, x7 y59 w14 h10')
  })

  it('breaks a tie in paint order, so the output never depends on iteration luck', () => {
    const a = box('a', 300, 300, 100, 100)
    const b = box('b', 300, 300, 100, 100)
    expect(describeFrame(FRAME, [FRAME, a, b])).toBe(describeFrame(FRAME, [FRAME, a, b]))
    // Same box twice: neither is larger, so neither holds the other.
    expect(describeFrame(FRAME, [FRAME, a, b])).not.toContain('Inside')
  })

  it('says so when the frame is empty', () => {
    expect(describeFrame(FRAME, [FRAME])).toBe(
      'Frame 1440×1024, landscape. No elements: the frame is empty.',
    )
  })

  it('reports orientation from the frame, not from what is in it', () => {
    const phone: Shape = { ...FRAME, width: 393, height: 852 }
    expect(describeFrame(phone, [phone, box('b', 10, 10, 100, 40)])).toMatch(
      /^Frame 393×852, portrait\. 1 element, top to bottom, left to right\./,
    )
  })

  it('clips a shape that runs past the frame to the part the picture shows', () => {
    // Half of it hangs off the right edge; the model sees the half inside.
    const manifest = describeFrame(FRAME, [FRAME, box('overhang', 1240, 100, 400, 100)])
    expect(manifest).toContain('1. box, x86 y10 w14 h10')
  })

  it('ignores what is outside the frame, the frame itself and generated designs', () => {
    const outside = box('outside', 2000, 2000, 100, 100)
    const design: Shape = { ...box('design', 10, 10, 100, 100), kind: 'generated-ui', html: '<p>' }
    expect(frameContents(FRAME, [FRAME, outside, design])).toEqual([])
    expect(describeFrame(FRAME, [FRAME, outside, design])).toContain('the frame is empty')
  })

  it('assigns each element to its smallest holder, so a grandchild is inside the card, not the section', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      box('section', 100, 100, 1200, 800),
      box('card', 200, 200, 400, 400),
      box('avatar', 240, 240, 64, 64),
    ])
    expect(manifest).toContain('1. box, x7 y10 w83 h78 — the largest box. Contains 2.')
    expect(manifest).toContain('2. box, x14 y20 w28 h39 — square. Inside 1. Contains 3.')
    expect(manifest).toContain('3. box, x17 y23 w4 h6 — small and square. Inside 2.')
  })

  it('reads a text shape as its words and its type, and names a chosen face', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      text('quote', '  Ship it\n\n by Friday  ', 100, 100, 400, 60, {
        text: { fontSize: 32, fontWeight: 400, italic: true, fontFamily: 'Playfair Display' },
      }),
      text('blank', '   ', 100, 300, 100, 20),
    ])
    expect(manifest).toContain(
      '1. text "Ship it / by Friday", x7 y10 w28 h6, 32px italic, Playfair Display — the largest text.',
    )
    expect(manifest).toContain('2. text (empty), x7 y29 w7 h2, 16px.')
  })

  /**
   * The regression this exists for: a landscape sketch that fitted its frame
   * came back as a portrait page twice the frame's height. The picture showed
   * the frame's aspect and nothing said it was a rule, so the header now says
   * when the sketch goes on below the frame, and stays quiet when it does not.
   */
  it('says when the sketch runs past the bottom edge, and nothing when it fits', () => {
    expect(describeFrame(FRAME, LANDING)).not.toContain('past the bottom edge')
    expect(describeFrame(FRAME, [FRAME, box('tail', 100, 900, 400, 300)])).toContain(
      'Frame 1440×1024, landscape. 1 element, top to bottom, left to right. 1 element runs past the bottom edge, so the sketch continues below the frame. Positions and sizes are percentages of the frame.',
    )
    expect(
      describeFrame(FRAME, [FRAME, box('a', 100, 900, 400, 300), box('b', 600, 1000, 400, 300)]),
    ).toContain('. 2 elements run past the bottom edge, so the sketch continues below the frame.')
  })

  it('lets a footer sit on the bottom edge with a hand-drawn overhang', () => {
    // Eight pixels over, inside the same tolerance nesting allows: the page
    // ends here, it does not go on.
    expect(describeFrame(FRAME, [FRAME, box('footer', 0, 944, 1440, 88)])).not.toContain(
      'past the bottom edge',
    )
  })

  it('cuts a paragraph down to the part that says what it is', () => {
    const long = 'word '.repeat(80).trim()
    const manifest = describeFrame(FRAME, [FRAME, text('para', long, 100, 100, 400, 60)])
    const quoted = manifest.match(/text "([^"]*)"/)?.[1] ?? ''
    expect(quoted.length).toBe(160)
    expect(quoted.endsWith('…')).toBe(true)
  })

  it('calls a box a pill only when its corners meet and it is wider than tall', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      box('pill', 100, 100, 200, 44, { style: { radius: 22 } }),
      box('rounded', 100, 300, 200, 44, { style: { radius: 8 } }),
      box('tall', 100, 500, 44, 200, { style: { radius: 22 } }),
    ])
    expect(manifest).toContain('1. box, x7 y10 w14 h4, pill')
    expect(manifest).toContain('2. box, x7 y29 w14 h4 —')
    expect(manifest).toContain('3. box, x7 y49 w3 h20 —')
    expect(manifest).toContain('Marks: 1 is a pill.')
  })

  it('keeps the strokes that survive: outline, border, thickness and fade', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      box('outlined', 100, 100, 300, 100, { fill: 'transparent', style: { strokeWidth: 6 } }),
      box('bordered', 500, 100, 300, 100, { style: { strokeWidth: 2 } }),
      box('ghost', 900, 100, 300, 100, { style: { opacity: 0.3 } }),
      { ...box('rule', 100, 400, 1200, 0), kind: 'line', fill: '#fff', style: { strokeWidth: 5 } },
    ])
    expect(manifest).toContain('1. box, x7 y10 w21 h10, outlined, thick stroke.')
    // "filled" is said only where it contrasts: these two share a row with 1.
    expect(manifest).toContain('2. box, x35 y10 w21 h10, filled, bordered — beside 1, same row.')
    expect(manifest).toContain('3. box, x63 y10 w21 h10, filled, faded — beside 2, same row.')
    expect(manifest).toContain('4. horizontal line, x7 y39 w83 h0, thick stroke.')
    expect(manifest).toContain('Rows: [1, 2, 3].')
    expect(manifest).toContain(
      'Marks: 1 is outlined while the other boxes are filled; 1 and 4 have a thick stroke; 3 is faded.',
    )
  })

  it('names circles, ellipses, lines and scribbles by what they are', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      { ...box('dot', 100, 100, 80, 80), kind: 'ellipse', fill: '#4ADE80' },
      { ...box('oval', 300, 100, 240, 80), kind: 'ellipse', fill: '#4ADE80' },
      { ...box('vrule', 700, 100, 0, 300), kind: 'line', fill: '#fff' },
      { ...box('doodle', 900, 100, 120, 90), kind: 'pencil', fill: '#fff' },
    ])
    expect(manifest).toContain('1. circle, x7 y10 w6 h8 — small and square.')
    expect(manifest).toContain('2. ellipse, x21 y10 w17 h8 — the largest box; beside 1, same row.')
    expect(manifest).toContain('3. vertical line, x49 y10 w0 h29.')
    expect(manifest).toContain('4. scribble, x63 y10 w8 h9.')
    // A stroke is not a region: the line and the scribble make no column.
    expect(manifest).toContain('Columns: left [1] spanning x7–13; right [2] spanning x21–38.')
  })

  it('finds the rail down the side and the bar across the bottom', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      box('sidebar', 0, 0, 260, 1024),
      box('footer', 0, 944, 1440, 80),
    ])
    expect(manifest).toContain(
      '1. box, x0 y0 w18 h100 — full height along the left edge (a rail); the largest box.',
    )
    expect(manifest).toContain('2. box, x0 y92 w100 h8 — full width along the bottom edge (a bar).')
  })

  it('resolves an arrow to what its ends touch, or to a place when they touch nothing', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      box('from', 100, 100, 200, 100),
      box('to', 900, 600, 200, 100),
      arrow('hit', [200, 150], [950, 650]),
      arrow('miss', [200, 150], [600, 900]),
    ])
    expect(manifest).toContain('; 2 arrows.')
    expect(manifest).toContain('Arrow from 1 to 2.')
    expect(manifest).toContain('Arrow from 1 to x42 y88.')
  })

  it('points an arrow at the smallest thing under its head, not the section around it', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      box('section', 100, 100, 1200, 800),
      box('button', 200, 200, 160, 48),
      // The tail starts in the margin, out of reach of the section's corner.
      arrow('cta', [10, 10], [250, 220]),
    ])
    expect(manifest).toContain('Arrow from x1 y1 to 2.')
  })

  it('gives three columns their names and more than three their numbers', () => {
    const three = [1, 2, 3].map((n) => box(`c${n}`, 100 + (n - 1) * 450, 100, 400, 500))
    expect(describeFrame(FRAME, [FRAME, ...three])).toContain(
      'Columns: left [1] spanning x7–35; middle [2] spanning x38–66; right [3] spanning x69–97.',
    )
    const four = [1, 2, 3, 4].map((n) => box(`c${n}`, 50 + (n - 1) * 350, 100, 300, 500))
    expect(describeFrame(FRAME, [FRAME, ...four])).toContain('column 1 [1]')
    expect(describeFrame(FRAME, [FRAME, ...four])).toContain('column 4 [4]')
  })

  it('does not let a full-width bar fuse two columns into one', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      box('bar', 0, 0, 1440, 64),
      box('left', 100, 200, 500, 600),
      box('right', 800, 200, 500, 600),
    ])
    expect(manifest).toContain('Columns: left [2] spanning x7–42; right [3] spanning x56–90.')
  })

  it('lists the first hundred and twenty elements and counts the rest', () => {
    const many = Array.from({ length: MAX_ELEMENTS + 10 }, (_, index) =>
      box(`b${index}`, (index % 12) * 110 + 20, Math.floor(index / 12) * 80 + 20, 90, 60),
    )
    const manifest = describeFrame(FRAME, [FRAME, ...many])
    expect(manifest).toContain(`${MAX_ELEMENTS + 10} elements, top to bottom, left to right.`)
    expect(manifest).toContain(`\n${MAX_ELEMENTS}. box, `)
    expect(manifest).not.toContain(`\n${MAX_ELEMENTS + 1}. box, `)
    expect(manifest).toContain('\nand 10 more, omitted.')
    // The route cuts anything longer; an honest manifest must not reach it.
    expect(manifest.length).toBeLessThan(MANIFEST_MAX_CHARS)
  })

  it('caps the arrows on their own', () => {
    const arrows = Array.from({ length: MAX_ARROWS + 3 }, (_, index) =>
      arrow(`a${index}`, [20, 20 + index * 20], [200, 20 + index * 20]),
    )
    const manifest = describeFrame(FRAME, [FRAME, box('target', 180, 10, 100, 1000), ...arrows])
    expect(manifest).toContain(`; ${MAX_ARROWS + 3} arrows.`)
    expect(manifest.match(/^Arrow from /gm)).toHaveLength(MAX_ARROWS)
    expect(manifest).toContain('\nand 3 more arrows, omitted.')
  })
})

describe('frameSizeOf', () => {
  /**
   * The user prompt states the frame's size as a rule, read back from the
   * header the manifest starts with. Writer and reader are pinned together so
   * a change to the header's shape fails here rather than silently leaving
   * the prompt with no frame.
   */
  it('reads back what describeFrame wrote', () => {
    expect(frameSizeOf(describeFrame(FRAME, LANDING))).toEqual({
      width: 1440,
      height: 1024,
      orientation: 'landscape',
      pastTheEdge: 0,
    })
    const phone: Shape = { ...FRAME, width: 393, height: 852 }
    expect(frameSizeOf(describeFrame(phone, [phone, box('b', 10, 10, 100, 40)]))).toMatchObject({
      width: 393,
      height: 852,
      orientation: 'portrait',
    })
  })

  it('counts the elements that run past the bottom edge', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      box('a', 100, 900, 400, 300),
      box('b', 600, 1000, 400, 300),
    ])
    expect(frameSizeOf(manifest)?.pastTheEdge).toBe(2)
    expect(frameSizeOf(describeFrame(FRAME, [FRAME, box('a', 100, 900, 400, 300)]))?.pastTheEdge).toBe(1)
  })

  it('reads an empty frame, which still has a size', () => {
    expect(frameSizeOf(describeFrame(FRAME, [FRAME]))).toMatchObject({ width: 1440, height: 1024 })
  })

  it('reads only the header, not a label that happens to say the words', () => {
    const manifest = describeFrame(FRAME, [
      FRAME,
      text('trap', '3 elements run past the bottom edge', 100, 100, 400, 60),
    ])
    expect(frameSizeOf(manifest)?.pastTheEdge).toBe(0)
  })

  it('is null for a manifest with no header, or none at all', () => {
    expect(frameSizeOf('')).toBeNull()
    expect(frameSizeOf(undefined)).toBeNull()
    expect(frameSizeOf(null)).toBeNull()
    expect(frameSizeOf('1. box, x0 y0 w100 h6')).toBeNull()
    expect(frameSizeOf('Frame 1440 by 1024')).toBeNull()
  })
})
