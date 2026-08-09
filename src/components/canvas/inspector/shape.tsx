'use client'

import { useRef } from 'react'
import { useDispatch } from 'react-redux'

import { Slider } from '@/components/ui/slider'
import {
  HAS_RADIUS,
  IS_STROKED,
  MAX_SHAPE_RADIUS,
  MAX_STROKE_WIDTH,
  SHADOW_PRESETS,
  SHAPE_SWATCHES,
  shapeStyleOf,
  type ShapeStyle,
} from '@/lib/text-style'
import { cn } from '@/lib/utils'
import type { Shape } from '@/redux/slice/shapes'
import {
  snapshotHistory,
  updateShape,
  updateShapeLive,
  updateShapeStyle,
  updateShapeStyleLive,
} from '@/redux/slice/shapes'

import { Field, InspectorPanel, SwatchRow } from './parts'

/**
 * Shape inspector — the non-text half.
 *
 * Which controls appear depends on the kind: a pencil stroke has no fill and
 * no corners, an ellipse has no corners, a frame has no shadow worth having.
 * Showing a radius slider that does nothing is worse than not showing one.
 */
export const ShapeInspector = ({ shape }: { shape: Shape }) => {
  const dispatch = useDispatch()
  const style = shapeStyleOf(shape)

  const stroked = IS_STROKED.includes(shape.kind)
  const rounded = HAS_RADIUS.includes(shape.kind)

  const set = (changes: Partial<ShapeStyle>) =>
    dispatch(updateShapeStyle({ id: shape.id, changes }))

  const dragging = useRef(false)
  const onSlide = (changes: Partial<ShapeStyle>) => {
    if (!dragging.current) {
      dispatch(snapshotHistory())
      dragging.current = true
    }
    dispatch(updateShapeStyleLive({ id: shape.id, changes }))
  }
  const endSlide = () => {
    dragging.current = false
  }

  /** The shape's own colour lives on `fill`, not in `style`. */
  const setFill = (fill: string) => dispatch(updateShape({ id: shape.id, changes: { fill } }))
  const setFillLive = (fill: string) =>
    dispatch(updateShapeLive({ id: shape.id, changes: { fill } }))

  return (
    <InspectorPanel>
      <Field label={stroked ? 'Stroke Colour' : 'Fill'}>
        <SwatchRow
          value={shape.fill}
          onPick={setFill}
          onLive={setFillLive}
          swatches={SHAPE_SWATCHES}
        />
      </Field>

      {!stroked && (
        <Field label={`Border: ${style.strokeWidth}px`}>
          <Slider
            min={0}
            max={MAX_STROKE_WIDTH}
            step={1}
            value={[style.strokeWidth]}
            onValueChange={([strokeWidth]) => onSlide({ strokeWidth })}
            onValueCommit={endSlide}
          />
          {style.strokeWidth > 0 && (
            <div className="pt-2">
              <SwatchRow
                value={style.strokeColor}
                onPick={(strokeColor) => set({ strokeColor })}
                onLive={(strokeColor) =>
                  dispatch(updateShapeStyleLive({ id: shape.id, changes: { strokeColor } }))
                }
                swatches={SHAPE_SWATCHES}
              />
            </div>
          )}
        </Field>
      )}

      {stroked && (
        <Field label={`Thickness: ${Math.max(1, style.strokeWidth || 2)}px`}>
          <Slider
            min={1}
            max={MAX_STROKE_WIDTH}
            step={1}
            value={[Math.max(1, style.strokeWidth || 2)]}
            onValueChange={([strokeWidth]) => onSlide({ strokeWidth })}
            onValueCommit={endSlide}
          />
        </Field>
      )}

      {rounded && (
        <Field label={`Corner Radius: ${style.radius}px`}>
          <Slider
            min={0}
            max={MAX_SHAPE_RADIUS}
            step={1}
            value={[style.radius]}
            onValueChange={([radius]) => onSlide({ radius })}
            onValueCommit={endSlide}
          />
        </Field>
      )}

      <Field label={`Opacity: ${Math.round(style.opacity * 100)}%`}>
        <Slider
          min={0.05}
          max={1}
          step={0.05}
          value={[style.opacity]}
          onValueChange={([opacity]) => onSlide({ opacity })}
          onValueCommit={endSlide}
        />
      </Field>

      <Field label="Shadow">
        <div className="flex flex-wrap gap-1">
          {SHADOW_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => set({ shadow: preset.value })}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[11px] transition-colors',
                style.shadow === preset.value
                  ? 'bg-white/15 text-white'
                  : 'bg-white/[0.05] text-white/60 hover:bg-white/10',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Field>
    </InspectorPanel>
  )
}
