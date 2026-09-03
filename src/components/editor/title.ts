/**
 * What the tab is called while a design is open.
 *
 * It said "Editor", the route's static title, for every design: five tabs of
 * the same product were five tabs called Editor, and the one holding the
 * pricing page could only be found by opening them in turn. The design's own
 * headline is what a person remembers it by, so that comes first; the name it
 * was given on the canvas next; then the instruction it was generated from,
 * which is at least what was asked for. In a session the product is Mason.
 */
export const designTitle = ({
  headline,
  label,
  instruction,
}: {
  headline?: string | null
  label?: string | null
  instruction?: string | null
}): string => {
  const name = clip(headline) ?? clip(label) ?? clip(instruction) ?? 'Design'
  return `${name} | Mason`
}

/** One line, and short enough for a tab to show most of. */
const clip = (text?: string | null): string | null => {
  const clean = text?.replace(/\s+/g, ' ').trim()
  if (!clean) return null
  return clean.length > 60 ? `${clean.slice(0, 59).trimEnd()}…` : clean
}
