'use client'

import { Bold, Italic, Palette, Strikethrough, Underline } from 'lucide-react'
import { useRef } from 'react'
import { useDispatch } from 'react-redux'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  TEXT_FONTS,
  TEXT_WEIGHTS,
  isBold,
  textStyleOf,
  type TextStyle,
} from '@/lib/text-style'
import type { Shape } from '@/redux/slice/shapes'
import { snapshotHistory, updateTextStyle, updateTextStyleLive } from '@/redux/slice/shapes'

/**
 * Text inspector.
 *
 * Appears whenever a text shape is selected. Every control writes straight to
 * the shape, so what the canvas shows is always the stored value — there is no
 * local draft to fall out of sync.
 *
 * Sliders snapshot history once, on the first change of a gesture, then write
 * through `updateTextStyleLive`. Dragging font size from 16 to 48 is one undo
 * step rather than thirty-two — and snapshotting at the *start* matters:
 * committing on release would store the value the drag had already reached, so
 * the first undo press would appear to do nothing.
 */
export const Inspector = ({ shape }: { shape: Shape }) => {
  const dispatch = useDispatch()
  const style = textStyleOf(shape)

  const set = (changes: Partial<TextStyle>) =>
    dispatch(updateTextStyle({ id: shape.id, changes }))
  const setLive = (changes: Partial<TextStyle>) =>
    dispatch(updateTextStyleLive({ id: shape.id, changes }))

  /** True once a slider gesture has already taken its snapshot. */
  const dragging = useRef(false)

  const onSlide = (changes: Partial<TextStyle>) => {
    if (!dragging.current) {
      dispatch(snapshotHistory())
      dragging.current = true
    }
    setLive(changes)
  }
  const endSlide = () => {
    dragging.current = false
  }

  return (
    <aside
      // The canvas treats a pointerdown on empty space as "deselect", which
      // would close this panel the moment you reached for a slider.
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      className="absolute top-1/2 right-6 z-30 flex w-[272px] -translate-y-1/2 flex-col gap-5 rounded-xl border border-white/10 bg-[#141416]/95 p-4 shadow-2xl backdrop-blur"
    >
      <Field label="Font Family">
        <Select value={style.fontFamily} onValueChange={(value) => set({ fontFamily: value })}>
          <SelectTrigger className="h-9 w-full border-white/10 bg-white/[0.04] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEXT_FONTS.map((font) => (
              <SelectItem key={font} value={font} className="text-xs">
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={`Font Size: ${style.fontSize}px`}>
        <Slider
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          step={1}
          value={[style.fontSize]}
          onValueChange={([fontSize]) => onSlide({ fontSize })}
          onValueCommit={endSlide}
        />
      </Field>

      <Field label={`Font Weight: ${style.fontWeight}`}>
        <Slider
          min={0}
          max={TEXT_WEIGHTS.length - 1}
          step={1}
          value={[Math.max(0, TEXT_WEIGHTS.indexOf(style.fontWeight as never))]}
          onValueChange={([index]) => onSlide({ fontWeight: TEXT_WEIGHTS[index] })}
          onValueCommit={endSlide}
        />
      </Field>

      <Field label="Style">
        <div className="flex items-center gap-1">
          {/* Bold is the weight, not a separate flag, so the toggle and the
              slider above can never disagree. */}
          <StyleToggle
            label="Bold"
            pressed={isBold(style)}
            onPressedChange={(on) => set({ fontWeight: on ? 700 : 400 })}
          >
            <Bold className="size-3.5" />
          </StyleToggle>
          <StyleToggle
            label="Italic"
            pressed={style.italic}
            onPressedChange={(italic) => set({ italic })}
          >
            <Italic className="size-3.5" />
          </StyleToggle>
          <StyleToggle
            label="Underline"
            pressed={style.underline}
            onPressedChange={(underline) => set({ underline })}
          >
            <Underline className="size-3.5" />
          </StyleToggle>
          <StyleToggle
            label="Strikethrough"
            pressed={style.strike}
            onPressedChange={(strike) => set({ strike })}
          >
            <Strikethrough className="size-3.5" />
          </StyleToggle>
        </div>
      </Field>

      <Field label={`Line Height: ${style.lineHeight.toFixed(1)}`}>
        <Slider
          min={0.8}
          max={2.4}
          step={0.1}
          value={[style.lineHeight]}
          onValueChange={([lineHeight]) => onSlide({ lineHeight })}
          onValueCommit={endSlide}
        />
      </Field>

      <Field label={`Letter Spacing: ${style.letterSpacing}px`}>
        <Slider
          min={-4}
          max={16}
          step={0.5}
          value={[style.letterSpacing]}
          onValueChange={([letterSpacing]) => onSlide({ letterSpacing })}
          onValueCommit={endSlide}
        />
      </Field>

      <Field
        label={
          <span className="flex items-center gap-1.5">
            <Palette className="size-3.5" />
            Text Color
          </span>
        }
      >
        <div className="flex items-center gap-2">
          <input
            value={style.color}
            onChange={(event) => {
              const color = event.target.value
              // Only paint once it is a complete hex — otherwise typing "#f"
              // blanks the text on the canvas mid-keystroke.
              setLive({ color: /^#[0-9a-f]{6}$/i.test(color) ? color : style.color })
              if (/^#[0-9a-f]{6}$/i.test(color)) set({ color })
            }}
            spellCheck={false}
            className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 font-mono text-xs text-white outline-none focus:border-white/25"
          />
          <label className="relative size-9 shrink-0 overflow-hidden rounded-md border border-white/10">
            <span className="block size-full" style={{ background: style.color }} />
            <input
              type="color"
              value={style.color}
              onChange={(event) => setLive({ color: event.target.value })}
              onBlur={(event) => set({ color: event.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </Field>
    </aside>
  )
}

const Field = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-2">
    <span className="block text-[11px] text-white/70">{label}</span>
    {children}
  </div>
)

const StyleToggle = ({
  label,
  pressed,
  onPressedChange,
  children,
}: {
  label: string
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: React.ReactNode
}) => (
  <Toggle
    aria-label={label}
    pressed={pressed}
    onPressedChange={onPressedChange}
    size="sm"
    className="size-8 text-white/70 data-[state=on]:bg-white/15 data-[state=on]:text-white"
  >
    {children}
  </Toggle>
)
