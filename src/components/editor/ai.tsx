'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'

/**
 * Ask-the-model, scoped to the selected element.
 *
 * The whole-design chat on the canvas rewrites a page; this rewrites one
 * element, which is what makes it usable for "make this bigger" — the model
 * only sees the thing being changed, so it has nothing else to accidentally
 * rewrite, and it answers in seconds rather than a minute.
 */
const SUGGESTIONS = [
  'Make this bigger',
  'Make it stand out more',
  'Tighten the spacing',
  'Use the accent colour',
  'Round the corners',
]

export const AiPanel = ({
  label,
  busy,
  onAsk,
}: {
  label: string
  busy: boolean
  onAsk: (instruction: string) => void
}) => {
  const [instruction, setInstruction] = useState('')

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    onAsk(trimmed)
    setInstruction('')
  }

  return (
    <section className="flex flex-col gap-3 border-t border-white/[0.08] p-4">
      <h3 className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-white/40 uppercase">
        <Sparkles className="size-3" />
        Ask AI
      </h3>

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        Editing the <span className="text-foreground">{label}</span>. One credit per
        request.
      </p>

      <textarea
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends, shift+enter breaks the line — a one-line instruction
          // is the common case here.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit(instruction)
          }
        }}
        rows={3}
        placeholder="Make this button wider and use the primary colour…"
        className="w-full resize-none rounded-md border border-white/10 bg-white/[0.04] p-2.5 text-xs outline-none placeholder:text-white/30 focus:border-white/25"
      />

      <div className="flex flex-wrap gap-1">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={busy}
            onClick={() => submit(suggestion)}
            className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white disabled:opacity-40"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={busy || !instruction.trim()}
        onClick={() => submit(instruction)}
        className="flex h-9 items-center justify-center gap-2 rounded-md bg-white text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-30"
      >
        {busy ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Working…
          </>
        ) : (
          'Apply'
        )}
      </button>
    </section>
  )
}
