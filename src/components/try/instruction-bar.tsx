'use client'

import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { shapesAdapter, snapshotHistory, updateShapeLive } from '@/redux/slice/shapes'

const selectors = shapesAdapter.getSelectors()

const PLACEHOLDER = 'Describe the selected frame (optional) — e.g. a pricing page for a coffee subscription'

/**
 * One line of words to go with the sketch. It edits the selected frame's
 * `instruction`, which use-frame sends alongside the PNG and Explore shows
 * next to the result.
 *
 * Typing goes through `updateShapeLive` after one `snapshotHistory` on
 * focus, the same shape the sliders use: `updateShape` commits an undo step
 * per call, and a step per keystroke would make Ctrl+Z on the canvas walk
 * back a sentence letter by letter.
 */
export const InstructionBar = () => {
  const dispatch = useAppDispatch()
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

  return (
    <div className="flex items-center gap-3 border-b border-white/[0.08] bg-background px-4 py-1.5">
      <label className="sr-only" htmlFor="try-instruction">
        Describe the selected frame
      </label>
      <input
        id="try-instruction"
        type="text"
        value={frame?.instruction ?? ''}
        disabled={!frame}
        placeholder={frame ? PLACEHOLDER : 'Select a frame to describe what it should become'}
        onFocus={() => dispatch(snapshotHistory())}
        onChange={(event) => {
          if (frame) dispatch(updateShapeLive({ id: frame.id, changes: { instruction: event.target.value } }))
        }}
        className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
      />
      <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">
        Sent with the sketch when you press Generate
      </span>
    </div>
  )
}
