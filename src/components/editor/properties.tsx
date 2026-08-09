'use client'

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from 'lucide-react'

import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { StyleGuide } from '@/types/style-guide'
import { STYLE_GUIDE } from '@/components/style-guide/config'

import { Input } from '@/components/ui/input'

import { directText, isTextEditable, parseLength, readStyle, toHex } from './node'

/**
 * The property panel.
 *
 * Every control writes straight to the selected element's inline style, which
 * is the same mechanism the model used to write the design in the first place
 * — so an edit is indistinguishable from generated markup, and survives being
 * serialised and reloaded.
 *
 * Values are read from `getComputedStyle` when there is no inline value, so a
 * heading that inherits its colour still shows the colour it is rendering.
 */
export const Properties = ({
  element,
  guide,
  onStyle,
  onText,
  onAttribute,
  onUpload,
  uploading,
}: {
  element: HTMLElement
  guide: StyleGuide | null
  onStyle: (property: string, value: string) => void
  onText: (text: string) => void
  onAttribute: (name: string, value: string) => void
  onUpload: (file: File) => void
  uploading: boolean
}) => {
  const isImage = element.tagName === 'IMG'
  const width = parseLength(element.style.width || 'auto')
  const height = parseLength(element.style.height || 'auto')
  const scale = guide?.typeScale?.length ? guide.typeScale : STYLE_GUIDE.typeScale
  const spacing = guide?.spacing?.length ? guide.spacing : STYLE_GUIDE.spacing
  const radii = guide?.radii?.length ? guide.radii : STYLE_GUIDE.radii

  const swatches = (guide?.colorSections ?? []).flatMap((section) =>
    section.swatches.map((swatch) => ({ name: swatch.name, value: swatch.color })),
  )

  const fontSize = Number.parseFloat(readStyle(element, 'font-size')) || 16
  const fontWeight = readStyle(element, 'font-weight') || '400'
  const align = readStyle(element, 'text-align') || 'left'
  const radius = Number.parseFloat(readStyle(element, 'border-radius')) || 0
  const opacity = Number.parseFloat(readStyle(element, 'opacity'))
  const padding = Number.parseFloat(readStyle(element, 'padding-top')) || 0
  const gap = Number.parseFloat(readStyle(element, 'gap')) || 0
  const isFlex = readStyle(element, 'display').includes('flex')

  const italic = readStyle(element, 'font-style') === 'italic'
  const underline = readStyle(element, 'text-decoration-line').includes('underline')
  const bold = Number.parseInt(fontWeight, 10) >= 600

  return (
    <div className="flex flex-col gap-6 p-4">
      <Group label={element.tagName.toLowerCase()}>
        {isTextEditable(element) && (
          <Field label="Text">
            <Textarea
              value={directText(element)}
              onChange={(event) => onText(event.target.value)}
              rows={3}
              className="resize-none border-white/10 bg-white/[0.04] text-xs"
            />
          </Field>
        )}
      </Group>

      {isImage && (
        <Group label="Image">
          <Field label="Source">
            <Input
              value={element.getAttribute('src') ?? ''}
              placeholder="https://…"
              onChange={(event) => onAttribute('src', event.target.value)}
              className="h-9 border-white/10 bg-white/[0.04] text-xs"
            />
          </Field>

          <Field label="Or upload one">
            <label className="flex h-9 cursor-pointer items-center justify-center rounded-md border border-dashed border-white/20 text-[11px] text-white/70 transition-colors hover:border-white/40 hover:text-white">
              {uploading ? 'Uploading…' : 'Choose a file'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onUpload(file)
                  // Cleared so choosing the same file twice still fires.
                  event.target.value = ''
                }}
              />
            </label>
          </Field>

          <Field label="Alt text">
            <Input
              value={element.getAttribute('alt') ?? ''}
              placeholder="Describes the image"
              onChange={(event) => onAttribute('alt', event.target.value)}
              className="h-9 border-white/10 bg-white/[0.04] text-xs"
            />
          </Field>

          <Field label="Fit">
            <div className="flex gap-1">
              {(['cover', 'contain', 'fill'] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => onStyle('object-fit', fit)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-[11px] transition-colors',
                    readStyle(element, 'object-fit') === fit
                      ? 'bg-white/15 text-white'
                      : 'bg-white/[0.05] text-white/60 hover:bg-white/10',
                  )}
                >
                  {fit}
                </button>
              ))}
            </div>
          </Field>
        </Group>
      )}

      <Group label="Size">
        <div className="grid grid-cols-2 gap-2">
          <Size
            label="Width"
            length={width}
            onChange={(next) => onStyle('width', next)}
          />
          <Size
            label="Height"
            length={height}
            onChange={(next) => onStyle('height', next)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Preset onClick={() => onStyle('width', '100%')}>Full width</Preset>
          <Preset onClick={() => onStyle('width', 'auto')}>Auto width</Preset>
          <Preset onClick={() => onStyle('height', 'auto')}>Auto height</Preset>
        </div>
      </Group>

      <Group label="Type">
        <Field label={`Size: ${Math.round(fontSize)}px`}>
          <Slider
            min={8}
            max={96}
            step={1}
            value={[fontSize]}
            onValueChange={([next]) => onStyle('font-size', `${next}px`)}
          />
        </Field>

        {scale && scale.length > 0 && (
          <Field label="Or take a role from the scale">
            <div className="flex flex-wrap gap-1">
              {scale.map((style) => (
                <button
                  key={style.name}
                  type="button"
                  title={`${style.fontSize}px · ${style.fontWeight}`}
                  onClick={() => {
                    onStyle('font-size', `${style.fontSize}px`)
                    onStyle('font-weight', String(style.fontWeight))
                    onStyle('line-height', String(style.lineHeight))
                    onStyle('letter-spacing', `${style.letterSpacing}em`)
                  }}
                  className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
                >
                  {style.name}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label={`Weight: ${fontWeight}`}>
          <Slider
            min={100}
            max={900}
            step={100}
            value={[Number.parseInt(fontWeight, 10) || 400]}
            onValueChange={([next]) => onStyle('font-weight', String(next))}
          />
        </Field>

        <Field label="Style">
          <div className="flex items-center gap-1">
            <Toggle
              on={bold}
              label="Bold"
              onClick={() => onStyle('font-weight', bold ? '400' : '700')}
            >
              <Bold className="size-3.5" />
            </Toggle>
            <Toggle
              on={italic}
              label="Italic"
              onClick={() => onStyle('font-style', italic ? 'normal' : 'italic')}
            >
              <Italic className="size-3.5" />
            </Toggle>
            <Toggle
              on={underline}
              label="Underline"
              onClick={() =>
                onStyle('text-decoration-line', underline ? 'none' : 'underline')
              }
            >
              <Underline className="size-3.5" />
            </Toggle>

            <span className="mx-1 h-5 w-px bg-white/10" />

            {(
              [
                ['left', AlignLeft],
                ['center', AlignCenter],
                ['right', AlignRight],
              ] as const
            ).map(([value, Icon]) => (
              <Toggle
                key={value}
                on={align === value}
                label={`Align ${value}`}
                onClick={() => onStyle('text-align', value)}
              >
                <Icon className="size-3.5" />
              </Toggle>
            ))}
          </div>
        </Field>

        <Colour
          label="Text colour"
          value={toHex(readStyle(element, 'color'))}
          swatches={swatches}
          onPick={(next) => onStyle('color', next)}
        />
      </Group>

      <Group label="Fill and border">
        <Colour
          label="Background"
          value={toHex(readStyle(element, 'background-color'))}
          swatches={swatches}
          onPick={(next) => onStyle('background-color', next)}
        />

        <Field label={`Corner radius: ${Math.round(radius)}px`}>
          <Slider
            min={0}
            max={64}
            step={1}
            value={[Math.min(radius, 64)]}
            onValueChange={([next]) => onStyle('border-radius', `${next}px`)}
          />
          {radii && (
            <div className="flex flex-wrap gap-1 pt-2">
              {radii.map((step) => (
                <button
                  key={step.name}
                  type="button"
                  onClick={() => onStyle('border-radius', `${step.value}px`)}
                  className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
                >
                  {step.name}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Colour
          label="Border colour"
          value={toHex(readStyle(element, 'border-top-color'))}
          swatches={swatches}
          onPick={(next) => {
            // Setting a colour on a border with no width shows nothing, which
            // reads as a broken control.
            if (!Number.parseFloat(readStyle(element, 'border-top-width'))) {
              onStyle('border-style', 'solid')
              onStyle('border-width', '1px')
            }
            onStyle('border-color', next)
          }}
        />

        <Field label={`Opacity: ${Math.round((Number.isNaN(opacity) ? 1 : opacity) * 100)}%`}>
          <Slider
            min={0.05}
            max={1}
            step={0.05}
            value={[Number.isNaN(opacity) ? 1 : opacity]}
            onValueChange={([next]) => onStyle('opacity', String(next))}
          />
        </Field>
      </Group>

      <Group label="Layout">
        <Field label={`Padding: ${Math.round(padding)}px`}>
          <Slider
            min={0}
            max={80}
            step={2}
            value={[Math.min(padding, 80)]}
            onValueChange={([next]) => onStyle('padding', `${next}px`)}
          />
          {spacing && (
            <div className="flex flex-wrap gap-1 pt-2">
              {spacing.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => onStyle('padding', `${step}px`)}
                  className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
                >
                  {step}
                </button>
              ))}
            </div>
          )}
        </Field>

        {isFlex && (
          <Field label={`Gap: ${Math.round(gap)}px`}>
            <Slider
              min={0}
              max={64}
              step={2}
              value={[Math.min(gap, 64)]}
              onValueChange={([next]) => onStyle('gap', `${next}px`)}
            />
          </Field>
        )}
      </Group>
    </div>
  )
}

const Preset = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
  >
    {children}
  </button>
)

/**
 * A number and its unit. `auto` is a unit rather than a separate control
 * because that is how it behaves — picking it makes the number meaningless.
 */
const Size = ({
  label,
  length,
  onChange,
}: {
  label: string
  length: { value: number; unit: string }
  onChange: (value: string) => void
}) => (
  <div className="space-y-1.5">
    <span className="block text-[11px] text-white/70">{label}</span>
    <div className="flex gap-1">
      <Input
        type="number"
        value={length.unit === 'auto' ? '' : length.value}
        placeholder="auto"
        disabled={length.unit === 'auto'}
        onChange={(event) =>
          onChange(`${event.target.value || 0}${length.unit === 'auto' ? 'px' : length.unit}`)
        }
        className="h-8 min-w-0 border-white/10 bg-white/[0.04] px-2 text-xs"
      />
      <select
        value={length.unit}
        onChange={(event) =>
          onChange(event.target.value === 'auto' ? 'auto' : `${length.value}${event.target.value}`)
        }
        className="h-8 shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1 text-[11px] outline-none"
      >
        {['px', '%', 'auto'].map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
      </select>
    </div>
  </div>
)

const Group = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h3 className="text-[10px] tracking-[0.14em] text-white/40 uppercase">{label}</h3>
    {children}
  </section>
)

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <span className="block text-[11px] text-white/70">{label}</span>
    {children}
  </div>
)

const Toggle = ({
  on,
  label,
  onClick,
  children,
}: {
  on: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={on}
    title={label}
    onClick={onClick}
    className={cn(
      'grid size-8 place-items-center rounded-md transition-colors',
      on ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/[0.08]',
    )}
  >
    {children}
  </button>
)

/** Guide swatches first, then an eyedropper for anything else. */
const Colour = ({
  label,
  value,
  swatches,
  onPick,
}: {
  label: string
  value: string
  swatches: { name: string; value: string }[]
  onPick: (colour: string) => void
}) => (
  <Field label={label}>
    <div className="flex flex-wrap items-center gap-1.5">
      {swatches.map((swatch) => (
        <button
          key={swatch.name + swatch.value}
          type="button"
          title={`${swatch.name} · ${swatch.value}`}
          onClick={() => onPick(swatch.value)}
          style={{ background: swatch.value }}
          className={cn(
            'size-6 rounded-md border transition-transform hover:scale-110',
            value.toLowerCase() === swatch.value.toLowerCase()
              ? 'border-white ring-1 ring-white/60'
              : 'border-white/15',
          )}
        />
      ))}
      {/* No colour at all — a picker cannot express it, and a card that
          should show the page behind it needs it. */}
      <button
        type="button"
        title="Transparent"
        aria-label="Transparent"
        onClick={() => onPick('transparent')}
        className={cn(
          'grid size-6 place-items-center rounded-md border text-[9px] transition-transform hover:scale-110',
          value === 'transparent' ? 'border-white ring-1 ring-white/60' : 'border-white/15',
        )}
        style={{
          backgroundImage:
            'linear-gradient(45deg,#555 25%,transparent 25%,transparent 75%,#555 75%),linear-gradient(45deg,#555 25%,transparent 25%,transparent 75%,#555 75%)',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 4px 4px',
        }}
      />
      <label className="relative size-6 overflow-hidden rounded-md border border-dashed border-white/30">
        <span className="block size-full" style={{ background: value }} />
        <input
          type="color"
          value={value}
          aria-label={`${label} picker`}
          onChange={(event) => onPick(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <span className="ml-1 font-mono text-[10px] text-white/40">{value}</span>
    </div>
  </Field>
)
