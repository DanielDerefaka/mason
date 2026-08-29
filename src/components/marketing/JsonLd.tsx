/**
 * A structured-data block.
 *
 * `JSON.stringify` handles quoting, but not the one sequence that matters
 * inside a <script>: a literal "</script>" in any string value would close the
 * element early and drop the rest of the page into the document as markup. The
 * "<" is escaped to its JSON unicode form, which parses back identically and
 * cannot terminate the tag. Nothing model-generated reaches this — every
 * caller passes an object literal — but the escape costs one replace and
 * removes the question.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
