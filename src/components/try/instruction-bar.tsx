'use client'

import { useState } from 'react'

import { useAppDispatch, useAppSelector, useAppStore } from '@/redux/hooks'
import { shapesAdapter, snapshotHistory, updateShapeLive } from '@/redux/slice/shapes'

const selectors = shapesAdapter.getSelectors()

const PLACEHOLDER = 'Describe the selected frame (optional), e.g. a pricing page for a coffee subscription'

/**
 * What is being typed, and which frame it is for. Held with the id because
 * clicking another frame moves the selection before this field blurs, so a
 * draft committed to "the selected frame" would land on the wrong one.
 */
type Draft = { id: string; text: string }

/**
 * One line of words to go with the sketch. It edits the selected frame's
 * `instruction`, which use-frame sends alongside the PNG and Explore shows
 * next to the result.
 *
 * The words stay in the field while they are being typed and reach the store
 * when the field is left, or on Enter. They used to go through the store on
 * every keystroke, which re-rendered the whole canvas per letter and had the
 * autosave effect answer each render with a state update of its own from
 * inside the same commit: React gave up at its nesting limit (error 185) and
 * the keystroke that tripped it was lost, so a sentence arrived with letters
 * missing. Generate reads the frame from the store, and pressing its button
 * takes focus from this field before the click lands, so the blur commits
 * first. History gets one `snapshotHistory` on focus, so Ctrl+Z on the
 * canvas walks back the sentence, not a letter of it.
 */
export const InstructionBar = () => {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  // Through the adapter's own selector, not `entities[id]`: `state.shapes
  // .entities` is the adapter state, so indexing it by an id reads a
  // property that is not there and always answers undefined. This bar was
  // permanently disabled because of it — a frame was selected, and the bar
  // said nothing was.
  const frame = useAppSelector((state) => {
    const { selectedIds, entities } = state.shapes
    if (selectedIds.length !== 1) return null
    const shape = selectors.selectById(entities, selectedIds[0])
    return shape?.kind === 'frame' ? shape : null
  })
  const [draft, setDraft] = useState<Draft | null>(null)

  const commit = () => {
    if (!draft) return
    setDraft(null)
    // Only a change is written: a focus and blur without typing must not
    // touch the table, or the header would announce unsaved changes for it.
    const stored = selectors.selectById(store.getState().shapes.entities, draft.id)
    if (!stored || (stored.instruction ?? '') === draft.text) return
    dispatch(updateShapeLive({ id: draft.id, changes: { instruction: draft.text } }))
  }

  const value = draft && draft.id === frame?.id ? draft.text : (frame?.instruction ?? '')

  return (
    <div className="flex items-center gap-3 border-b border-white/[0.08] bg-background px-4 py-1.5">
      <label className="sr-only" htmlFor="try-instruction">
        Describe the selected frame
      </label>
      <input
        id="try-instruction"
        type="text"
        value={value}
        disabled={!frame}
        placeholder={frame ? PLACEHOLDER : 'Select a frame to describe what it should become'}
        onFocus={() => {
          if (!frame) return
          dispatch(snapshotHistory())
          setDraft({ id: frame.id, text: frame.instruction ?? '' })
        }}
        onChange={(event) => {
          if (frame) setDraft({ id: frame.id, text: event.target.value })
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          // Blurring commits, so Enter and leaving the field are one path.
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
      />
      <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">
        Sent with the sketch when you press Generate
      </span>
    </div>
  )
}
