/** As much of a headline as a card's title row can hold. */
const MAX_LENGTH = 60

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/** The handful of entities a headline is likely to carry, back to text. */
const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return ENTITIES[entity.toLowerCase()] ?? match
  })

const tidy = (text: string) => {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > MAX_LENGTH ? `${line.slice(0, MAX_LENGTH - 1).trimEnd()}…` : line
}

/**
 * The design's own headline: what its first `<h1>` says, as plain text.
 *
 * A regex rather than a parser, because the gallery sanitises and parses
 * every design once already and a title is not worth a second walk. Tags
 * inside the heading are dropped, entities decoded, whitespace folded. Null
 * when there is no heading or it holds no text, so the caller can fall back.
 */
export const headlineOf = (html: string | null | undefined) => {
  if (!html) return null
  const match = /<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i.exec(html)
  if (!match) return null
  // A line break is a space; an inline tag round a word is nothing at all,
  // or "Plan <em>less</em>," would come out as "Plan less ,".
  const inner = match[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '')
  const text = tidy(decode(inner))
  return text || null
}

/**
 * What to call a design on its Explore card.
 *
 * The card used the design's label, which is the frame's, which is nearly
 * always the preset the frame was made at: a gallery of "MacBook Air" and
 * "iPhone 16", with nothing to say which was which. The design itself has a
 * headline, and the person who drew it wrote an instruction; either says
 * more than a screen size. The label is kept as the last resort, so a design
 * with neither reads as it did.
 */
export const exploreTitle = (item: {
  label: string
  instruction: string | null
  html: string
}) => headlineOf(item.html) ?? (item.instruction?.trim() ? tidy(item.instruction) : null) ?? item.label
