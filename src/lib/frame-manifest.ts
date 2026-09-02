import { DEFAULT_TEXT_STYLE, isBold, shapeStyleOf, textStyleOf } from '@/lib/text-style'
import type { Point, Shape, ShapeKind } from '@/redux/slice/shapes'

/**
 * The sketch as words.
 *
 * The model gets the frame as a PNG, and a PNG of purple blocks on near-black
 * carries less than the shape data it was drawn from. Two boxes at 40% and 55%
 * of the width are a 40/55 split in the data and "roughly two columns" in the
 * picture; a box inside a box is a component in the data and one purple slab
 * in the picture; an outlined box beside a filled one is a deliberate contrast
 * in the data and two blocks in the picture. The inspiration path works
 * because a structured extraction turns pixels into named facts before the
 * design call. This is that pass for the sketch, minus the model: pure,
 * deterministic, free, and sent as text ahead of the image so the geometry is
 * read from numbers and the picture only has to show what numbers cannot.
 *
 * Everything is a whole-number percentage of the frame, so a manifest reads the
 * same whatever the frame's pixel size, and the order of the lines can be
 * checked against the numbers on them.
 */

/**
 * Numbered lines past this are summarised. A sketch this big is a whole board,
 * and the prompt has a budget the picture is already spending.
 */
export const MAX_ELEMENTS = 120

/** Arrows are listed apart from the elements, with a cap of their own. */
export const MAX_ARROWS = 40

/**
 * What the route keeps. A manifest is text the browser sent, so the server
 * cuts it here whatever the client claims; the element cap above keeps an
 * honest one well inside it.
 */
export const MANIFEST_MAX_CHARS = 12_000

/** Longer text is the drawer's paragraph, and the first part of it says what it is. */
const MAX_LABEL_CHARS = 160

type Box = { left: number; top: number; right: number; bottom: number }

/** Kinds that occupy a box, as opposed to a text run or a stroke. */
const BOX_KINDS: ShapeKind[] = ['rectangle', 'ellipse', 'image', 'frame']

type Element = {
  n: number
  shape: Shape
  /** World coordinates, clipped to the frame, so the numbers match the picture. */
  box: Box
  area: number
  x: number
  y: number
  w: number
  h: number
  parent: Element | null
  children: Element[]
}

const overlaps = (shape: Shape, frame: Shape) =>
  shape.x < frame.x + frame.width &&
  shape.x + shape.width > frame.x &&
  shape.y < frame.y + frame.height &&
  shape.y + shape.height > frame.y

/**
 * What a frame holds: everything that touches it, except the frame itself and
 * the designs generated from it. The rasteriser draws exactly this set, so the
 * picture and the manifest describe the same sketch.
 */
export const frameContents = (frame: Shape, shapes: Shape[]): Shape[] =>
  shapes.filter(
    (shape) => shape.id !== frame.id && shape.kind !== 'generated-ui' && overlaps(shape, frame),
  )

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

const widthOf = (box: Box) => box.right - box.left
const heightOf = (box: Box) => box.bottom - box.top

/** Connected components of a symmetric relation, each in discovery order. */
const components = <T>(items: T[], related: (a: T, b: T) => boolean): T[][] => {
  const groups: T[][] = []
  const seen = new Set<T>()
  for (const item of items) {
    if (seen.has(item)) continue
    const group = [item]
    seen.add(item)
    for (let index = 0; index < group.length; index += 1) {
      for (const other of items) {
        if (seen.has(other) || !related(group[index], other)) continue
        seen.add(other)
        group.push(other)
      }
    }
    groups.push(group)
  }
  return groups
}

/** "3", "3 and 5", "3, 5 and 8". */
const list = (numbers: number[]) =>
  numbers.length <= 1
    ? numbers.join('')
    : `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`

/**
 * A label as the model should read it. Line breaks are the drawer's, so they
 * survive as a separator; the rest of the whitespace is noise.
 */
const quote = (label: string | undefined): string => {
  const cleaned = (label ?? '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' / ')
  if (!cleaned) return ''
  const cut = cleaned.length > MAX_LABEL_CHARS ? `${cleaned.slice(0, MAX_LABEL_CHARS - 1)}…` : cleaned
  return `"${cut}"`
}

/** The one element whose value beats every other's; nothing when it is a tie or a field of one. */
const strictMax = (candidates: Element[], value: (element: Element) => number): Element | null => {
  if (candidates.length < 2) return null
  const best = candidates.reduce((top, element) => (value(element) > value(top) ? element : top))
  const rivals = candidates.filter((element) => element !== best)
  return rivals.every((element) => value(element) < value(best)) ? best : null
}

export const describeFrame = (frame: Shape, shapes: Shape[]): string => {
  const width = Math.max(1, frame.width)
  const height = Math.max(1, frame.height)
  const orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square'
  const size = `Frame ${Math.round(width)}×${Math.round(height)}, ${orientation}.`

  const contents = frameContents(frame, shapes)
  const arrows = contents.filter((shape) => shape.kind === 'arrow' && (shape.points?.length ?? 0) >= 2)
  const numbered = contents.filter((shape) => shape.kind !== 'arrow')

  if (numbered.length === 0 && arrows.length === 0) {
    return `${size} No elements: the frame is empty.`
  }

  const pct = (value: number, of: number) => Math.round((value / of) * 100)
  const at = (point: Point) =>
    `x${clamp(pct(point.x - frame.x, width), 0, 100)} y${clamp(pct(point.y - frame.y, height), 0, 100)}`

  const measured = numbered.map((shape, index) => {
    const box: Box = {
      left: clamp(shape.x, frame.x, frame.x + width),
      top: clamp(shape.y, frame.y, frame.y + height),
      right: clamp(shape.x + shape.width, frame.x, frame.x + width),
      bottom: clamp(shape.y + shape.height, frame.y, frame.y + height),
    }
    return {
      shape,
      index,
      box,
      area: widthOf(box) * heightOf(box),
      x: pct(box.left - frame.x, width),
      y: pct(box.top - frame.y, height),
      w: pct(widthOf(box), width),
      h: pct(heightOf(box), height),
    }
  })

  // Reading order in the units the manifest prints, so the numbering can be
  // checked against the coordinates on the lines. Paint order breaks a tie,
  // which makes the output a pure function of the shape list.
  measured.sort((a, b) => a.y - b.y || a.x - b.x || a.index - b.index)
  const omitted = Math.max(0, measured.length - MAX_ELEMENTS)
  const elements: Element[] = measured
    .slice(0, MAX_ELEMENTS)
    .map((entry, index) => ({ ...entry, n: index + 1, parent: null, children: [] }))

  // A hand-drawn box inside another rarely stays inside by the pixel, so a
  // small overhang still counts. The smallest holder is the parent; anything
  // larger is an ancestor and is reached through it.
  const tolerance = Math.max(2, 0.01 * Math.min(width, height))
  const inside = (inner: Box, outer: Box) =>
    inner.left >= outer.left - tolerance &&
    inner.top >= outer.top - tolerance &&
    inner.right <= outer.right + tolerance &&
    inner.bottom <= outer.bottom + tolerance

  for (const element of elements) {
    const holders = elements.filter(
      (other) =>
        other !== element &&
        BOX_KINDS.includes(other.shape.kind) &&
        other.area > element.area &&
        inside(element.box, other.box),
    )
    const parent = holders.sort((a, b) => a.area - b.area)[0] ?? null
    element.parent = parent
    parent?.children.push(element)
  }

  // Two elements share a row when they overlap vertically by at least half
  // the shorter one and are within a few multiples in height, so a headline
  // beside a tall card is not "a row" while a field beside its button is.
  const sameRow = (a: Element, b: Element) => {
    const overlap = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top)
    const shorter = Math.min(heightOf(a.box), heightOf(b.box))
    const taller = Math.max(heightOf(a.box), heightOf(b.box))
    return overlap > 0 && overlap >= shorter / 2 && taller <= shorter * 2.5
  }

  const topLevel = elements.filter((element) => element.parent === null)
  const siblingGroups = [topLevel, ...elements.map((element) => element.children)]
  const rows = siblingGroups
    .flatMap((group) => components(group, sameRow))
    .filter((row) => row.length >= 2)
    .map((row) => row.sort((a, b) => a.box.left - b.box.left))
    .sort((a, b) => a[0].n - b[0].n)
  const rowOf = new Map<Element, Element[]>()
  for (const row of rows) for (const member of row) rowOf.set(member, row)

  // Columns are read off the top level only, from the boxes and text that
  // make regions. A bar spanning the page is not a column, since it would join
  // every column into one, and a stroke is a mark on the layout, not part of it.
  const sameColumn = (a: Element, b: Element) =>
    Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left) > 0
  const columns = components(
    topLevel.filter(
      (element) =>
        element.w < 80 && (BOX_KINDS.includes(element.shape.kind) || element.shape.kind === 'text'),
    ),
    sameColumn,
  )
    .map((column) => column.sort((a, b) => a.n - b.n))
    .sort(
      (a, b) =>
        Math.min(...a.map((element) => element.box.left)) -
        Math.min(...b.map((element) => element.box.left)),
    )

  const largestBox = strictMax(
    elements.filter((element) => BOX_KINDS.includes(element.shape.kind)),
    (element) => element.area,
  )
  const largestText = strictMax(
    elements.filter((element) => element.shape.kind === 'text'),
    (element) => textStyleOf(element.shape).fontSize,
  )

  const isOutlined = (element: Element) =>
    (element.shape.kind === 'rectangle' || element.shape.kind === 'ellipse') &&
    element.shape.fill === 'transparent' &&
    shapeStyleOf(element.shape).strokeWidth > 0

  /**
   * The marks a drawer makes on purpose. "filled" is the default, so it is
   * only worth saying beside a box that is not: a filled button next to an
   * outlined field is the contrast the drawer meant, and the summary line
   * covers the rest.
   */
  const marksOf = (element: Element): string[] => {
    const { kind } = element.shape
    const style = shapeStyleOf(element.shape)
    const filled = element.shape.fill !== 'transparent'
    const stroked = kind === 'pencil' || kind === 'line'
    const marks: string[] = []

    if (kind === 'rectangle' || kind === 'ellipse') {
      if (isOutlined(element)) marks.push('outlined')
      else if (filled && (rowOf.get(element) ?? []).some(isOutlined)) marks.push('filled')
      if (filled && style.strokeWidth > 0) marks.push('bordered')
    } else if (kind === 'image' && style.strokeWidth > 0) {
      marks.push('bordered')
    }
    if (
      kind === 'rectangle' &&
      style.radius * 2 >= heightOf(element.box) &&
      widthOf(element.box) > heightOf(element.box)
    ) {
      marks.push('pill')
    }
    const strokeWidth = stroked ? Math.max(1, style.strokeWidth || 2) : style.strokeWidth
    if (strokeWidth >= 4 && kind !== 'text' && kind !== 'frame') marks.push('thick stroke')
    if (style.opacity <= 0.5 && kind !== 'text') marks.push('faded')
    return marks
  }
  const marks = new Map(elements.map((element) => [element, marksOf(element)]))

  const describeKind = (element: Element): string => {
    const { kind } = element.shape
    const label = quote(element.shape.label)
    const named = (word: string) => (label ? `${word} ${label}` : word)
    const w = widthOf(element.box)
    const h = heightOf(element.box)
    const ratio = h > 0 ? w / h : Infinity

    switch (kind) {
      case 'rectangle':
        return named('box')
      case 'ellipse':
        return named(ratio >= 0.85 && ratio <= 1.18 ? 'circle' : 'ellipse')
      case 'image':
        return named('image')
      case 'frame':
        return named('frame')
      case 'text':
        return `text ${label || '(empty)'}`
      case 'line':
        if (ratio >= 8) return 'horizontal line'
        if (ratio <= 1 / 8) return 'vertical line'
        return 'line'
      default:
        return 'scribble'
    }
  }

  /** Shape words for a box: the first thing a designer would say about it. */
  const shapeWords = (element: Element): string => {
    if (!BOX_KINDS.includes(element.shape.kind)) return ''
    const { x, y, w, h } = element
    if (w >= 90 && h <= 12) {
      if (y <= 2) return 'full width along the top edge (a bar)'
      if (y + h >= 98) return 'full width along the bottom edge (a bar)'
      return 'full width (a bar)'
    }
    if (h >= 90 && w <= 25) {
      if (x <= 2) return 'full height along the left edge (a rail)'
      if (x + w >= 98) return 'full height along the right edge (a rail)'
      return 'full height (a rail)'
    }
    const pixelWidth = widthOf(element.box)
    const pixelHeight = heightOf(element.box)
    const ratio = pixelHeight > 0 ? pixelWidth / pixelHeight : Infinity
    const aspect =
      ratio >= 4
        ? 'wide and thin'
        : ratio <= 0.25
          ? 'tall and thin'
          : ratio <= 0.6
            ? 'tall'
            : ratio >= 0.85 && ratio <= 1.18
              ? 'square'
              : ''
    // Under a hundredth of the frame it is an icon, a button or a badge, and
    // "thin" says nothing about something that small.
    const small = element.area < 0.01 * width * height
    if (small) return aspect ? `small and ${aspect.replace(' and thin', '')}` : 'small'
    return aspect
  }

  const describe = (element: Element): string => {
    const { shape } = element
    const group = element.parent ? element.parent.children : topLevel
    const previous = group[group.indexOf(element) - 1] as Element | undefined

    const geometry =
      shape.kind === 'text'
        ? `x${element.x} y${element.y} w${element.w}`
        : `x${element.x} y${element.y} w${element.w} h${element.h}`

    const detail: string[] = []
    if (shape.kind === 'text') {
      const text = textStyleOf(shape)
      detail.push(
        `${text.fontSize}px${isBold(text) ? ' bold' : ''}${text.italic ? ' italic' : ''}` +
          (text.fontFamily !== DEFAULT_TEXT_STYLE.fontFamily ? `, ${text.fontFamily}` : ''),
      )
    }
    detail.push(...(marks.get(element) ?? []))

    const notes: string[] = []
    const words = shapeWords(element)
    if (words) notes.push(words)
    if (element === largestBox) notes.push('the largest box')
    if (element === largestText) notes.push('the largest text')
    if (!element.parent && previous && sameRow(previous, element)) {
      notes.push(`beside ${previous.n}, same row`)
    }

    const head =
      `${element.n}. ${describeKind(element)}, ${geometry}` +
      (detail.length ? `, ${detail.join(', ')}` : '') +
      (notes.length ? ` — ${notes.join('; ')}` : '')

    let placement = ''
    if (element.parent) {
      const relation = !previous
        ? ''
        : sameRow(previous, element)
          ? `, beside ${previous.n}`
          : previous.box.bottom <= element.box.top + tolerance
            ? `, below ${previous.n}`
            : ''
      placement = `Inside ${element.parent.n}${relation}.`
    }

    const holds = element.children.length
      ? `Contains ${element.children.map((child) => child.n).join(', ')}.`
      : ''

    return [`${head}.`, placement, holds].filter(Boolean).join(' ')
  }

  // An arrow points at whatever is under its head, or the nearest thing
  // within reach; further than that it points at a place, and the place is
  // what gets written.
  const reach = 0.08 * Math.max(width, height)
  const nearest = (point: Point): string => {
    let best: { element: Element; distance: number } | null = null
    for (const element of elements) {
      const dx = Math.max(element.box.left - point.x, 0, point.x - element.box.right)
      const dy = Math.max(element.box.top - point.y, 0, point.y - element.box.bottom)
      const distance = Math.hypot(dx, dy)
      const closer =
        !best ||
        distance < best.distance ||
        (distance === best.distance && element.area < best.element.area)
      if (closer) best = { element, distance }
    }
    return best && best.distance <= reach ? String(best.element.n) : at(point)
  }
  const arrowLines = arrows.slice(0, MAX_ARROWS).map((arrow) => {
    const points = arrow.points ?? []
    return `Arrow from ${nearest(points[0])} to ${nearest(points[points.length - 1])}.`
  })
  const omittedArrows = Math.max(0, arrows.length - MAX_ARROWS)

  const count = numbered.length
  const header =
    `${size} ${count} element${count === 1 ? '' : 's'}, top to bottom, left to right` +
    (arrows.length ? `; ${arrows.length} arrow${arrows.length === 1 ? '' : 's'}` : '') +
    '. Positions and sizes are percentages of the frame.'

  const body = [
    ...elements.map(describe),
    omitted ? `and ${omitted} more, omitted.` : '',
    ...arrowLines,
    omittedArrows ? `and ${omittedArrows} more arrows, omitted.` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const numbersOf = (group: Element[]) => `[${group.map((element) => element.n).join(', ')}]`
  const rowsSentence = rows.length
    ? `Rows: ${rows
        .map((row) => `${numbersOf(row)}${row[0].parent ? ` inside ${row[0].parent.n}` : ''}`)
        .join('; ')}.`
    : ''

  const columnNames =
    columns.length === 2
      ? ['left', 'right']
      : columns.length === 3
        ? ['left', 'middle', 'right']
        : columns.map((_, index) => `column ${index + 1}`)
  const columnsSentence =
    columns.length >= 2
      ? `Columns: ${columns
          .map((column, index) => {
            const left = Math.min(...column.map((element) => element.box.left))
            const right = Math.max(...column.map((element) => element.box.right))
            return `${columnNames[index]} ${numbersOf(column)} spanning x${pct(left - frame.x, width)}–${pct(right - frame.x, width)}`
          })
          .join('; ')}.`
      : ''

  const having = (mark: string) =>
    elements.filter((element) => marks.get(element)?.includes(mark)).map((element) => element.n)
  const pills = having('pill')
  const outlined = having('outlined')
  const thick = having('thick stroke')
  const faded = having('faded')
  const filledBoxes = elements.some(
    (element) =>
      (element.shape.kind === 'rectangle' || element.shape.kind === 'ellipse') &&
      element.shape.fill !== 'transparent',
  )
  const remarks = [
    pills.length ? `${list(pills)} ${pills.length === 1 ? 'is a pill' : 'are pills'}` : '',
    outlined.length
      ? `${list(outlined)} ${outlined.length === 1 ? 'is' : 'are'} outlined` +
        (filledBoxes ? ' while the other boxes are filled' : '')
      : '',
    thick.length ? `${list(thick)} ${thick.length === 1 ? 'has' : 'have'} a thick stroke` : '',
    faded.length ? `${list(faded)} ${faded.length === 1 ? 'is' : 'are'} faded` : '',
  ].filter(Boolean)
  const marksSentence = remarks.length ? `Marks: ${remarks.join('; ')}.` : ''

  const summary = [rowsSentence, columnsSentence, marksSentence].filter(Boolean).join(' ')

  return [header, body, summary].filter(Boolean).join('\n\n')
}
