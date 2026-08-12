'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Ask-the-model, scoped to the selected element.
 *
 * The whole-design chat on the canvas rewrites a page; this rewrites one
 * element, which is what makes it usable for "make this bigger" — the model
 * only sees the thing being changed, so it has nothing else to accidentally
 * rewrite, and it answers in seconds rather than a minute.
 */
const SUGGESTIONS = [
  // First, because it is the fix most designs generated before the responsive
  // rules existed actually need — run it on the outermost group.
  'Make this responsive: no fixed widths, wrap rows, min-width 0 on flex children, clamp() headings',
  'Make this bigger',
  'Make it stand out more',
  'Tighten the spacing',
  'Use the accent colour',
  'Round the corners',
]

/** Long instructions get a short chip. */
const SHORT: Record<string, string> = {
  'Make this responsive: no fixed widths, wrap rows, min-width 0 on flex children, clamp() headings':
    'Make responsive',
}

export type AiSection = { id: string; name: string }

export const AiPanel = ({
  label,
  busy,
  onAsk,
  sections = [],
  onTarget,
}: {
  label: string
  busy: boolean
  onAsk: (instruction: string) => void
  /** The page's top-level sections, for `/name` addressing. */
  sections?: AiSection[]
  onTarget?: (id: string) => void
}) => {
  const [instruction, setInstruction] = useState('')

  /**
   * `/name` picks what the request is about.
   *
   * Without it the only way to aim at a section is to find and click it first,
   * which means leaving the sentence half-typed. Typing `/` lists the page's
   * sections; choosing one selects that node, so the request that follows
   * lands on it — the same target the rest of the editor is already using,
   * rather than a second idea of "current" that could disagree with it.
   */
  const slash = /(?:^|\s)\/([\w-]*)$/.exec(instruction)
  const matches = slash
    ? sections.filter((section) =>
        section.name.toLowerCase().replace(/\s+/g, '-').includes(slash[1].toLowerCase()),
      )
    : []

  const choose = (section: AiSection) => {
    onTarget?.(section.id)
    // Replace the token with the name so the sentence still reads back.
    setInstruction((current) => current.replace(/(?:^|\s)\/[\w-]*$/, ` the ${section.name} `))
  }

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    onAsk(trimmed)
    setInstruction('')
  }

  return (
    <section className="flex flex-col gap-2.5 p-3">
      <h3 className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-white/40 uppercase">
        <Sparkles className="size-3" />
        Ask AI
      </h3>

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        {label === 'whole page' ? (
          <>
            Nothing selected — click a part of the design, or type{' '}
            <span className="text-foreground">/</span> to pick a section.
          </>
        ) : (
          <>
            Editing the <span className="text-foreground">{label}</span>. One credit per
            request.
          </>
        )}
      </p>

      {matches.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-white/10 bg-[#141416]">
          {matches.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => choose(section)}
              className="block w-full px-2.5 py-1.5 text-left text-[11px] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              /{section.name.toLowerCase().replace(/\s+/g, '-')}
            </button>
          ))}
        </div>
      )}

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
        placeholder="Make this button wider… or type / to pick a section"
        className="w-full resize-none rounded-md border border-white/10 bg-white/[0.04] p-2.5 text-xs outline-none placeholder:text-white/30 focus:border-white/25"
      />

      {/* Only while empty: six chips under a filled box is noise, and the dock
          has to stay short enough not to cover the design. */}
      <div className={cn('flex flex-wrap gap-1', instruction.trim() && 'hidden')}>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={busy}
            onClick={() => submit(suggestion)}
            title={suggestion}
            className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white disabled:opacity-40"
          >
            {SHORT[suggestion] ?? suggestion}
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
