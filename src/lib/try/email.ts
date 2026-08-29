/**
 * The one rule for what counts as an address, shared by the box and the table.
 *
 * Both ends need it and they must agree: the dialog decides whether to enable
 * its button, and the mutation decides whether to write a row. Two copies
 * would drift, and the way that drift shows up is a visitor whose download is
 * refused by a server that will not say why.
 *
 * Deliberately loose. This is a launch list, not an authentication factor —
 * nothing is sent to the address at the moment it is given, so the cost of
 * accepting an odd-looking-but-real address is nil and the cost of refusing
 * one is a person who does not get their file.
 */
const SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/** Trimmed and lower-cased, so `by_email` really is one row per person. */
export const normaliseEmail = (value: string): string => value.trim().toLowerCase()

export const looksLikeEmail = (value: string): boolean => {
  const email = normaliseEmail(value)
  // Long enough to be refused here rather than by the database's own limits.
  return email.length <= 254 && SHAPE.test(email)
}
