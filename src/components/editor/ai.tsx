'use client'

import { Loader2 } from 'lucide-react'
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

/** The trailing `/name` being typed, if any. */
const SLASH = /(?:^|\s)\/[\w-]*$/

/** `/hero`, `/call-to-action`: a section's name as one token with no spaces in it. */
export const slugOf = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/^-|-$/g, '')

/** "Hero" from "Hero: Design faster", so the sentence reads "the hero". */
const roleOf = (name: string): string => name.split(': ')[0]

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Whether the instruction asks for anything.
 *
 * Apply lit up for a bare "/": the token the picker was reading counted as
 * text, and so did the " the Hero " a choice leaves behind, so pressing a
 * section and then Apply sent the model a sentence with no verb in it and
 * spent a credit finding that out. An address is not an instruction.
 */
export const isActionable = (instruction: string, sections: AiSection[] = []): boolean => {
  let rest = instruction.replace(/(?:^|\s)\/[\w-]*(?=\s|$)/g, ' ')
  for (const section of sections) {
    for (const name of [section.name, roleOf(section.name)]) {
      rest = rest.replace(new RegExp(`(?<!\\w)the ${escapeRegExp(name)}(?!\\w)`, 'gi'), ' ')
    }
  }
  return /\w/.test(rest)
}

export const AiPanel = ({
  label,
  busy,
  onAsk,
  onClose,
  sections = [],
  onTarget,
}: {
  label: string
  busy: boolean
  onAsk: (instruction: string) => void
  /** Escape, once there is no picker left to close. */
  onClose?: () => void
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
    ? sections.filter((section) => slugOf(section.name).includes(slash[1].toLowerCase()))
    : []

  const choose = (section: AiSection) => {
    onTarget?.(section.id)
    // Replace the token with the role so the sentence still reads back: "the
    // hero", not "the Hero: Design faster".
    setInstruction((current) => current.replace(SLASH, ` the ${roleOf(section.name)} `))
  }

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!isActionable(trimmed, sections) || busy) return
    onAsk(trimmed)
    setInstruction('')
  }

  return (
    // No heading of its own: the dock this sits in already carries one, and
    // two "Ask AI" labels in a 300px panel read as a rendering fault.
    <section className="flex flex-col gap-2.5 p-3 pt-1">
      <p className="text-muted-foreground text-[11px] leading-relaxed">
        {label === 'whole page' ? (
          <>
            Nothing selected. Click a part of the design, or type{' '}
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
              /{slugOf(section.name)}
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
          // Escape closes the nearest thing: the picker while one is open,
          // and the panel after that. It used to close neither, and the
          // editor behind it took the key as "clear the selection".
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            if (slash) setInstruction((current) => current.replace(SLASH, ''))
            else onClose?.()
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
        disabled={busy || !isActionable(instruction, sections)}
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
