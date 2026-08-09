'use client'

import { cn } from '@/lib/utils'

/**
 * Chrome shared by both inspectors, so the text panel and the shape panel
 * cannot drift apart in width, position or spacing.
 */
export const InspectorPanel = ({ children }: { children: React.ReactNode }) => (
  <aside
    // The canvas treats a pointerdown on empty space as "deselect", which
    // would close this panel the moment you reached for a slider.
    onPointerDown={(event) => event.stopPropagation()}
    onWheel={(event) => event.stopPropagation()}
    // A bottom sheet on a phone, a right-hand panel from md up. 272px anchored
    // right covers 70% of a 390px screen — including the shape being edited.
    className="absolute inset-x-0 bottom-0 z-30 flex max-h-[55vh] flex-col gap-5 overflow-y-auto border-t border-white/10 bg-[#141416]/95 p-4 pb-24 shadow-2xl backdrop-blur md:inset-x-auto md:top-1/2 md:right-6 md:bottom-auto md:max-h-[80vh] md:w-[272px] md:-translate-y-1/2 md:rounded-xl md:border md:pb-4"
  >
    {children}
  </aside>
)

export const Field = ({
  label,
  children,
}: {
  label: React.ReactNode
  children: React.ReactNode
}) => (
  <div className="space-y-2">
    <span className="block text-[11px] text-white/70">{label}</span>
    {children}
  </div>
)

/**
 * Preset swatches plus an eyedropper for anything else.
 *
 * `onLive` fires while the native picker is open — it emits `change` on every
 * mouse move over the gradient — and `onPick` commits one history entry when
 * it closes. Committing on every emission would bury undo.
 */
export const SwatchRow = ({
  value,
  onPick,
  onLive,
  swatches,
}: {
  value: string
  onPick: (colour: string) => void
  onLive: (colour: string) => void
  swatches: readonly string[]
}) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {swatches.map((colour) => (
      <button
        key={colour}
        type="button"
        aria-label={colour}
        onClick={() => onPick(colour)}
        style={{ background: colour }}
        className={cn(
          'size-6 rounded-md border transition-transform hover:scale-110',
          value.toLowerCase() === colour.toLowerCase()
            ? 'border-white ring-1 ring-white/60'
            : 'border-white/15',
        )}
      />
    ))}

    <label className="relative size-6 overflow-hidden rounded-md border border-dashed border-white/30">
      <span
        className="block size-full"
        style={{
          background:
            'conic-gradient(#f87171,#fbbf24,#34d399,#60a5fa,#a78bfa,#f87171)',
        }}
      />
      <input
        type="color"
        value={value}
        aria-label="Custom colour"
        onChange={(event) => onLive(event.target.value)}
        onBlur={(event) => onPick(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  </div>
)
