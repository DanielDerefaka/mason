'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MessageSquare, SendHorizonal, Sparkles, X } from 'lucide-react'
import { useDesignChat } from '@/hooks/use-design-chat'
import { cn } from '@/lib/utils'

/**
 * Conversational revisions for one generated screen.
 *
 * Lives outside the canvas's transformed layer so it stays a fixed size at any
 * zoom, and every screen keeps its own history — the conversation is about that
 * design, not about the project.
 */
export const DesignChat = () => {
  const { openFor, messages, streaming, send, close } = useDesignChat()
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openFor) inputRef.current?.focus()
  }, [openFor])

  // Follow the conversation as it grows.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages])

  if (!openFor) return null

  const submit = () => {
    const text = draft.trim()
    if (!text || streaming) return
    setDraft('')
    void send(text)
  }

  return (
    <aside className="pointer-events-auto absolute top-24 right-6 z-40 flex h-[26rem] w-80 flex-col rounded-xl border border-white/10 bg-[#141416]/95 shadow-2xl backdrop-blur">
      <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <MessageSquare className="text-muted-foreground size-4" />
        <p className="flex-1 text-sm">Design Chat</p>
        <button
          type="button"
          aria-label="Close design chat"
          onClick={close}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-white/[0.06]">
              <Sparkles className="text-muted-foreground size-4" />
            </span>
            <p className="text-sm">Ask me to redesign this UI</p>
            <p className="text-muted-foreground text-xs">
              I can change colours, layout, style, content and more.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed',
                message.role === 'user'
                  ? 'ml-auto bg-white/[0.1] text-foreground'
                  : 'bg-white/[0.04] text-muted-foreground',
              )}
            >
              {message.text === 'Redesigning…' ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" />
                  {message.text}
                </span>
              ) : (
                message.text
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.05] px-3 py-2">
          <input
            ref={inputRef}
            value={draft}
            disabled={streaming}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
            }}
            placeholder="Describe how you want to redesign this UI…"
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-xs outline-none disabled:opacity-50"
          />
          <button
            type="button"
            aria-label="Send"
            onClick={submit}
            disabled={streaming || draft.trim().length === 0}
            className="text-sky-400 transition-opacity disabled:opacity-30"
          >
            <SendHorizonal className="size-4" />
          </button>
        </div>
        <p className="text-muted-foreground mt-2 text-[11px]">
          {streaming ? 'Rewriting the design…' : 'Press Enter to send. Each change costs one credit.'}
        </p>
      </div>
    </aside>
  )
}

export default DesignChat
