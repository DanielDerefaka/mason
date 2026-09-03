'use client'

import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  Bold,
  Check,
  ChevronRight,
  Clipboard,
  Columns3,
  Component as ComponentIcon,
  Download,
  FolderDown,
  FileCode2,
  Italic,
  Lock,
  Plus,
  RotateCw,
  Rows3,
  Square,
  Trash2,
  Underline,
  WrapText,
} from 'lucide-react'
import { useState } from 'react'

import { useGuest } from '@/components/try/guest-context'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { StyleGuide } from '@/types/style-guide'
import { STYLE_GUIDE } from '@/components/style-guide/config'

import { Input } from '@/components/ui/input'

import {
  CORNERS,
  NODE_ATTR,
  NEW_SHADOW,
  NEW_STROKE,
  SIDES,
  type Shadow,
  type StyleWrite,
  alignWrites,
  alignmentOf,
  canAcceptDrop,
  containerAlignWrites,
  containerAlignment,
  directText,
  fillWrites,
  formatGradient,
  isFilling,
  isTextEditable,
  layoutMode,
  layoutWrites,
  nodeMarkup,
  parentAxis,
  parseGradient,
  parseLength,
  readCorners,
  readFillLayers,
  readRotation,
  readShadows,
  readSides,
  readStrokes,
  readStyle,
  removeStrokeWrites,
  sizeWrites,
  strokeWrites,
  toHex,
  withRotation,
  writeFillLayers,
  writeShadows,
} from './node'
import {
  PLACEMENT_COPY,
  PLACEMENT_LABEL,
  placementOf,
  placementWrites,
  type Placement,
} from './placement'

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
 *
 * Anything that takes more than one declaration to express goes through
 * `onStyles`, so a fill that clears three properties is one undo and not
 * three. The rules behind those writes live in `node.ts` and are tested
 * there; what is here is the panel.
 */
export const Properties = ({
  element,
  guide,
  locked,
  onStyle,
  onStyles,
  onText,
  onAttribute,
  onUpload,
  onReplace,
  onExport,
  onUnlock,
  component,
  componentIsSelection,
  instances,
  onCreateComponent,
  onRenameComponent,
  onDetachComponent,
  onPushToInstances,
  onSelectComponentRoot,
  uploading,
}: {
  element: HTMLElement
  guide: StyleGuide | null
  locked: boolean
  onStyle: (property: string, value: string) => void
  onStyles: (writes: StyleWrite[]) => void
  onText: (text: string) => void
  onAttribute: (name: string, value: string) => void
  onUpload: (file: File) => void
  onReplace: (html: string) => void
  onExport: (kind: 'html' | 'brief' | 'project') => void
  onUnlock: () => void
  component: string | null
  /** True when the selection is the component itself rather than part of one. */
  componentIsSelection: boolean
  instances: number
  onCreateComponent: () => void
  onRenameComponent: (name: string) => void
  onDetachComponent: () => void
  onPushToInstances: () => void
  onSelectComponentRoot: () => void
  uploading: boolean
}) => {
  const isImage = element.tagName === 'IMG'
  const scale = guide?.typeScale?.length ? guide.typeScale : STYLE_GUIDE.typeScale
  const spacing = guide?.spacing?.length ? guide.spacing : STYLE_GUIDE.spacing
  const radii = guide?.radii?.length ? guide.radii : STYLE_GUIDE.radii

  const swatches = (guide?.colorSections ?? []).flatMap((section) =>
    section.swatches.map((swatch) => ({ name: swatch.name, value: swatch.color })),
  )

  /**
   * Sections holding state of their own — a split corner control, an edited
   * draft of the markup — are keyed to the node, so selecting something else
   * does not carry one node's working state onto another.
   *
   * Each key is namespaced by its section. Two siblings sharing a key is not a
   * cosmetic mistake: React matches keyed children through a map, a duplicate
   * loses its match on the next update, and the section is re-inserted without
   * the old one being removed. It renders correctly once and grows by one copy
   * on every re-render after that — which looks like a rendering bug anywhere
   * except where it is.
   */
  const key = element.getAttribute(NODE_ATTR) ?? ''
  const placement = placementOf(readStyle(element, 'position'))
  const arranges = canAcceptDrop(element)
  const hasText = (element.textContent ?? '').trim().length > 0

  return (
    <div className="flex flex-col">
      {locked && (
        <div className="flex items-center gap-2 border-b border-white/[0.08] bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200/90">
          <Lock className="size-3 shrink-0" />
          <span className="min-w-0 flex-1">Locked. It cannot be picked or dragged on the canvas.</span>
          <button
            type="button"
            onClick={onUnlock}
            className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-white hover:bg-white/20"
          >
            Unlock
          </button>
        </div>
      )}

      <ComponentSection
        key={`component-${key}`}
        name={component}
        isSelection={componentIsSelection}
        instances={instances}
        onCreate={onCreateComponent}
        onRename={onRenameComponent}
        onDetach={onDetachComponent}
        onPush={onPushToInstances}
        onSelectRoot={onSelectComponentRoot}
      />

      <Alignment element={element} onStyles={onStyles} />
      <Position element={element} placement={placement} onStyle={onStyle} onStyles={onStyles} />
      {arranges && (
        <Layout element={element} spacing={spacing} onStyle={onStyle} onStyles={onStyles} />
      )}
      <Dimensions element={element} onStyle={onStyle} onStyles={onStyles} />
      <Appearance key={`appearance-${key}`} element={element} radii={radii} onStyle={onStyle} onStyles={onStyles} />

      {isImage && (
        <ImageSection
          element={element}
          uploading={uploading}
          onStyle={onStyle}
          onAttribute={onAttribute}
          onUpload={onUpload}
        />
      )}

      {hasText && !isImage && (
        <TextSection
          element={element}
          scale={scale}
          swatches={swatches}
          onStyle={onStyle}
          onStyles={onStyles}
          onText={onText}
        />
      )}

      <Fill element={element} swatches={swatches} onStyle={onStyle} onStyles={onStyles} />
      <Stroke element={element} swatches={swatches} onStyles={onStyles} />
      <Effects element={element} onStyle={onStyle} />
      <Code key={`code-${key}`} element={element} onReplace={onReplace} />
      <Export element={element} onExport={onExport} />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

/**
 * What the selection is, as a component.
 *
 * Three states worth telling apart: not a component, the component itself, and
 * something inside one. The third is the one that catches people out — an edit
 * made three levels inside an instance is an edit to that instance alone until
 * it is pushed, and the panel says so rather than leaving it to be discovered.
 */
const ComponentSection = ({
  name,
  isSelection,
  instances,
  onCreate,
  onRename,
  onDetach,
  onPush,
  onSelectRoot,
}: {
  name: string | null
  isSelection: boolean
  instances: number
  onCreate: () => void
  onRename: (name: string) => void
  onDetach: () => void
  onPush: () => void
  onSelectRoot: () => void
}) => {
  const [draft, setDraft] = useState<string | null>(null)

  if (!name) {
    return (
      <Group label="Component">
        <Add label="Create component from this" onClick={onCreate} />
        <p className="text-[10px] leading-relaxed text-white/40">
          A component exports as a file of its own, and can be placed again from the
          Insert panel.
        </p>
      </Group>
    )
  }

  return (
    <Group label="Component">
      <div className="flex items-center gap-1.5">
        <ComponentIcon className="size-3.5 shrink-0 text-sky-400" />
        <Input
          value={draft ?? name}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft !== null) onRename(draft)
            setDraft(null)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') setDraft(null)
          }}
          className="h-8 border-white/10 bg-white/[0.04] text-xs"
        />
      </div>

      {!isSelection && (
        <button
          type="button"
          onClick={onSelectRoot}
          className="text-left text-[10px] leading-relaxed text-white/45 hover:text-white/70"
        >
          You are editing part of this component, and only this instance of it.
          <span className="text-sky-400"> Select the component →</span>
        </button>
      )}

      <div className="flex flex-wrap gap-1">
        <Preset onClick={onPush}>
          Push to {instances - 1} other{instances === 2 ? '' : 's'}
        </Preset>
        <Preset onClick={onDetach}>Detach</Preset>
      </div>

      <p className="text-[10px] leading-relaxed text-white/40">
        {instances > 1
          ? 'Instances do not update as you type. Push when the change is the one you want everywhere.'
          : 'The only instance. Place another from the Insert panel.'}
      </p>
    </Group>
  )
}

/* ------------------------------------------------------------------ *
 * Alignment
 * ------------------------------------------------------------------ */

const HORIZONTAL = [
  ['start', AlignStartVertical, 'Align left'],
  ['center', AlignCenterVertical, 'Align centre'],
  ['end', AlignEndVertical, 'Align right'],
] as const

const VERTICAL = [
  ['start', AlignStartHorizontal, 'Align top'],
  ['center', AlignCenterHorizontal, 'Align middle'],
  ['end', AlignEndHorizontal, 'Align bottom'],
] as const

/**
 * Where the node sits inside its parent.
 *
 * Vertical alignment is only offered when the parent is a flex container:
 * there is no way to push a single child down inside ordinary block flow, and
 * a button that quietly does nothing is worse than one that is not there.
 */
const Alignment = ({
  element,
  onStyles,
}: {
  element: HTMLElement
  onStyles: (writes: StyleWrite[]) => void
}) => {
  const horizontal = alignmentOf(element, 'horizontal')
  const vertical = alignmentOf(element, 'vertical')
  const canVertical = parentAxis(element) !== null

  return (
    <Group label="Alignment">
      <div className="flex items-center gap-1">
        {HORIZONTAL.map(([position, Icon, label]) => (
          <Toggle
            key={position}
            on={horizontal === position}
            label={label}
            onClick={() => onStyles(alignWrites(element, 'horizontal', position))}
          >
            <Icon className="size-3.5" />
          </Toggle>
        ))}

        <span className="mx-1 h-5 w-px bg-white/10" />

        {VERTICAL.map(([position, Icon, label]) => (
          <Toggle
            key={position}
            on={vertical === position}
            label={canVertical ? label : `${label} (needs a parent with a layout)`}
            disabled={!canVertical}
            onClick={() => onStyles(alignWrites(element, 'vertical', position))}
          >
            <Icon className="size-3.5" />
          </Toggle>
        ))}
      </div>
    </Group>
  )
}

/* ------------------------------------------------------------------ *
 * Position
 * ------------------------------------------------------------------ */

const Position = ({
  element,
  placement,
  onStyle,
  onStyles,
}: {
  element: HTMLElement
  placement: Placement
  onStyle: (property: string, value: string) => void
  onStyles: (writes: StyleWrite[]) => void
}) => {
  const rotation = readRotation(element)
  // In the flow there is nothing to type into: the numbers are the layout's
  // answer, shown because they are worth knowing and disabled because changing
  // them is what the modes below are for.
  const placed = placement !== 'flow'

  return (
    <Group label="Position">
      <div className="grid grid-cols-3 gap-1.5">
        <NumberBox
          label="X"
          value={placed ? Math.round(Number.parseFloat(readStyle(element, 'left')) || 0) : Math.round(element.offsetLeft)}
          disabled={!placed}
          onChange={(next) => onStyle('left', `${next}px`)}
        />
        <NumberBox
          label="Y"
          value={placed ? Math.round(Number.parseFloat(readStyle(element, 'top')) || 0) : Math.round(element.offsetTop)}
          disabled={!placed}
          onChange={(next) => onStyle('top', `${next}px`)}
        />
        <NumberBox
          label="R"
          icon={<RotateCw className="size-3" />}
          value={rotation}
          onChange={(next) =>
            onStyle('transform', withRotation(element.style.transform ?? '', next))
          }
        />
      </div>

      <div className="flex gap-1">
        {(['flow', 'offset', 'free'] as Placement[]).map((mode) => (
          <Segment
            key={mode}
            on={placement === mode}
            onClick={() =>
              onStyles(
                placementWrites(mode, {
                  offsetLeft: element.offsetLeft,
                  offsetTop: element.offsetTop,
                }),
              )
            }
          >
            {PLACEMENT_LABEL[mode]}
          </Segment>
        ))}
      </div>
      <p className="text-[10px] leading-relaxed text-white/40">{PLACEMENT_COPY[placement]}</p>
    </Group>
  )
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

const POSITIONS = ['start', 'center', 'end'] as const

/**
 * How this container arranges what is inside it.
 *
 * The only section here with a real rule behind it: which CSS property carries
 * "left" and which carries "top" swaps with the direction, so the pad below
 * reads in screen terms and `node.ts` maps it.
 */
const Layout = ({
  element,
  spacing,
  onStyle,
  onStyles,
}: {
  element: HTMLElement
  spacing: number[] | undefined
  onStyle: (property: string, value: string) => void
  onStyles: (writes: StyleWrite[]) => void
}) => {
  const mode = layoutMode(element)
  const flexible = mode === 'row' || mode === 'column'
  const gap = Math.round(Number.parseFloat(readStyle(element, 'gap')) || 0)
  const padding = readSides(element, 'padding')
  const alignment = containerAlignment(element)
  const wraps = readStyle(element, 'flex-wrap') === 'wrap'

  return (
    <Group label="Layout">
      <Field label="Direction">
        <div className="flex gap-1">
          <Segment on={mode === 'block'} onClick={() => onStyles(layoutWrites('block'))}>
            <Square className="size-3" />
            None
          </Segment>
          <Segment on={mode === 'row'} onClick={() => onStyles(layoutWrites('row'))}>
            <Columns3 className="size-3" />
            Row
          </Segment>
          <Segment on={mode === 'column'} onClick={() => onStyles(layoutWrites('column'))}>
            <Rows3 className="size-3" />
            Column
          </Segment>
        </div>
        {mode === 'grid' && (
          <p className="text-[10px] leading-relaxed text-white/40">
            This container is a grid. Gap, padding and alignment still apply; changing the
            direction would replace the grid it was generated with.
          </p>
        )}
        {mode === 'block' && (
          <p className="text-[10px] leading-relaxed text-white/40">
            Children stack in normal flow. Give it a direction to control gap and alignment.
          </p>
        )}
      </Field>

      {(flexible || mode === 'grid') && (
        <>
          <Field label={`Gap: ${gap}px`}>
            <Slider
              min={0}
              max={64}
              step={2}
              value={[Math.min(gap, 64)]}
              onValueChange={([next]) => onStyle('gap', `${next}px`)}
            />
            <Tokens values={spacing} onPick={(value) => onStyle('gap', `${value}px`)} />
          </Field>

          <Field label="Align children">
            <div className="flex items-start gap-3">
              <div className="grid w-fit grid-cols-3 gap-px rounded-md bg-white/[0.06] p-1">
                {POSITIONS.map((vertical) =>
                  POSITIONS.map((horizontal) => {
                    const on =
                      alignment.horizontal === horizontal && alignment.vertical === vertical
                    return (
                      <button
                        key={`${horizontal}-${vertical}`}
                        type="button"
                        aria-label={`${vertical} ${horizontal}`}
                        title={`${vertical} ${horizontal}`}
                        aria-pressed={on}
                        onClick={() =>
                          onStyles(containerAlignWrites(element, horizontal, vertical))
                        }
                        className="grid size-5 place-items-center rounded-sm hover:bg-white/10"
                      >
                        <span
                          className={cn(
                            'block rounded-[1px] transition-all',
                            on ? 'size-2 bg-sky-400' : 'size-1 bg-white/30',
                          )}
                        />
                      </button>
                    )
                  }),
                )}
              </div>

              {flexible && (
                <div className="flex flex-col gap-1">
                  <Toggle
                    on={wraps}
                    label="Wrap onto more lines"
                    onClick={() => onStyle('flex-wrap', wraps ? 'nowrap' : 'wrap')}
                  >
                    <WrapText className="size-3.5" />
                  </Toggle>
                  <button
                    type="button"
                    onClick={() => onStyle('justify-content', 'space-between')}
                    className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
                  >
                    Space between
                  </button>
                </div>
              )}
            </div>
          </Field>
        </>
      )}

      <Field label="Padding">
        <div className="grid grid-cols-4 gap-1">
          {SIDES.map((side, index) => (
            <NumberBox
              key={side}
              label={side[0].toUpperCase()}
              value={padding[index]}
              onChange={(next) => onStyle(`padding-${side}`, `${next}px`)}
            />
          ))}
        </div>
        <Tokens values={spacing} onPick={(value) => onStyle('padding', `${value}px`)} />
      </Field>
    </Group>
  )
}

/* ------------------------------------------------------------------ *
 * Dimensions
 * ------------------------------------------------------------------ */

const Dimensions = ({
  element,
  onStyle,
  onStyles,
}: {
  element: HTMLElement
  onStyle: (property: string, value: string) => void
  onStyles: (writes: StyleWrite[]) => void
}) => {
  const width = parseLength(element.style.width || 'auto')
  const height = parseLength(element.style.height || 'auto')
  const clips = readStyle(element, 'overflow') === 'hidden'

  return (
    <Group label="Dimensions">
      <div className="grid grid-cols-2 gap-2">
        <Size
          label="Width"
          length={width}
          measured={Math.round(element.offsetWidth)}
          onChange={(next) => onStyles(sizeWrites(element, 'width', next))}
        />
        <Size
          label="Height"
          length={height}
          measured={Math.round(element.offsetHeight)}
          onChange={(next) => onStyles(sizeWrites(element, 'height', next))}
        />
      </div>

      <div className="flex flex-wrap gap-1">
        <Preset
          on={isFilling(element, 'width')}
          onClick={() => onStyles(fillWrites(element, 'width'))}
        >
          Fill width
        </Preset>
        <Preset
          on={isFilling(element, 'height')}
          onClick={() => onStyles(fillWrites(element, 'height'))}
        >
          Fill height
        </Preset>
        <Preset onClick={() => onStyles(sizeWrites(element, 'width', 'auto'))}>Auto width</Preset>
        <Preset onClick={() => onStyles(sizeWrites(element, 'height', 'auto'))}>Auto height</Preset>
        <Preset on={clips} onClick={() => onStyle('overflow', clips ? 'visible' : 'hidden')}>
          Clip content
        </Preset>
      </div>

      {parentAxis(element) && (
        <p className="text-[10px] leading-relaxed text-white/40">
          Inside a {parentAxis(element) === 'horizontal' ? 'row' : 'column'}: a fixed size along
          the {parentAxis(element) === 'horizontal' ? 'width' : 'height'} is written as a flex
          basis, so the container holds it rather than stretching it back.
        </p>
      )}
    </Group>
  )
}

/* ------------------------------------------------------------------ *
 * Appearance
 * ------------------------------------------------------------------ */

const Appearance = ({
  element,
  radii,
  onStyle,
  onStyles,
}: {
  element: HTMLElement
  radii: { name: string; value: number }[] | undefined
  onStyle: (property: string, value: string) => void
  onStyles: (writes: StyleWrite[]) => void
}) => {
  const corners = readCorners(element)
  const uniform = corners.every((corner) => corner === corners[0])
  const opacity = Number.parseFloat(readStyle(element, 'opacity'))
  const [split, setSplit] = useState(false)
  const independent = split || !uniform

  return (
    <Group label="Appearance">
      <Field label={`Opacity: ${Math.round((Number.isNaN(opacity) ? 1 : opacity) * 100)}%`}>
        <Slider
          min={0.05}
          max={1}
          step={0.05}
          value={[Number.isNaN(opacity) ? 1 : opacity]}
          onValueChange={([next]) => onStyle('opacity', String(next))}
        />
      </Field>

      <Field label={independent ? 'Corner radius' : `Corner radius: ${corners[0]}px`}>
        {independent ? (
          <div className="grid grid-cols-4 gap-1">
            {CORNERS.map((corner, index) => (
              <NumberBox
                key={corner}
                label={corner
                  .split('-')
                  .map((word) => word[0].toUpperCase())
                  .join('')}
                value={corners[index]}
                onChange={(next) => onStyle(`border-${corner}-radius`, `${next}px`)}
              />
            ))}
          </div>
        ) : (
          <Slider
            min={0}
            max={64}
            step={1}
            value={[Math.min(corners[0], 64)]}
            onValueChange={([next]) => onStyle('border-radius', `${next}px`)}
          />
        )}

        <div className="flex flex-wrap items-center gap-1 pt-1">
          <Tokens
            values={radii?.map((step) => step.value)}
            labels={radii?.map((step) => step.name)}
            onPick={(value) => onStyle('border-radius', `${value}px`)}
          />
          <Preset
            on={independent}
            onClick={() => {
              // Splitting keeps what is on screen: each corner starts from the
              // radius the element already has rather than from zero.
              if (!independent) onStyles(CORNERS.map((corner, index) => [`border-${corner}-radius`, `${corners[index]}px`]))
              else onStyle('border-radius', `${corners[0]}px`)
              setSplit(!independent)
            }}
          >
            {independent ? 'Link corners' : 'Corners apart'}
          </Preset>
        </div>
      </Field>
    </Group>
  )
}

/* ------------------------------------------------------------------ *
 * Fill
 * ------------------------------------------------------------------ */

type Swatch = { name: string; value: string }

/**
 * The background as the stack it is: a colour underneath, and any number of
 * gradients or images painted over it. A single "background" field could only
 * ever show the bottom of that stack, and writing to it threw the rest away.
 */
const Fill = ({
  element,
  swatches,
  onStyle,
  onStyles,
}: {
  element: HTMLElement
  swatches: Swatch[]
  onStyle: (property: string, value: string) => void
  onStyles: (writes: StyleWrite[]) => void
}) => {
  const layers = readFillLayers(element)

  const replace = (index: number, layer: string | null) => {
    const next = layers.slice()
    if (layer === null) next.splice(index, 1)
    else next[index] = layer
    onStyle('background-image', writeFillLayers(next))
  }

  return (
    <Group label="Fill">
      {layers.map((layer, index) => {
        const gradient = parseGradient(layer)
        return (
          <Row key={`${index}-${layer}`} onRemove={() => replace(index, null)}>
            {gradient ? (
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Chip
                    colour={gradient.from}
                    swatches={swatches}
                    onPick={(colour) => replace(index, formatGradient({ ...gradient, from: colour }))}
                  />
                  <Chip
                    colour={gradient.to}
                    swatches={swatches}
                    onPick={(colour) => replace(index, formatGradient({ ...gradient, to: colour }))}
                  />
                  <NumberBox
                    label="°"
                    value={gradient.angle}
                    onChange={(next) => replace(index, formatGradient({ ...gradient, angle: next }))}
                  />
                </div>
                <span
                  aria-hidden
                  className="h-3 rounded border border-white/10"
                  style={{ backgroundImage: formatGradient(gradient) }}
                />
              </div>
            ) : (
              <span
                title={layer}
                className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/50"
              >
                {layer}
              </span>
            )}
          </Row>
        )
      })}

      <Colour
        label="Background colour"
        value={toHex(readStyle(element, 'background-color'))}
        swatches={swatches}
        onPick={(next) => onStyle('background-color', next)}
      />

      <Add
        label="Add a gradient over it"
        onClick={() =>
          onStyles([
            [
              'background-image',
              writeFillLayers([
                formatGradient({
                  angle: 180,
                  from: 'rgba(0, 0, 0, 0)',
                  to: 'rgba(0, 0, 0, 0.45)',
                }),
                ...layers,
              ]),
            ],
          ])
        }
      />
    </Group>
  )
}

/* ------------------------------------------------------------------ *
 * Stroke
 * ------------------------------------------------------------------ */

const BORDER_STYLES = ['solid', 'dashed', 'dotted'] as const

/**
 * Borders read back as a list because that is what CSS holds: four sides that
 * usually agree and sometimes do not. They are shown as one row while they
 * agree, and as one row per side once they stop.
 */
const Stroke = ({
  element,
  swatches,
  onStyles,
}: {
  element: HTMLElement
  swatches: Swatch[]
  onStyles: (writes: StyleWrite[]) => void
}) => {
  const strokes = readStrokes(element)

  return (
    <Group label="Stroke">
      {strokes.map((stroke) => (
        <Row key={stroke.sides} onRemove={() => onStyles(removeStrokeWrites(stroke))}>
          <Chip
            colour={stroke.colour}
            swatches={swatches}
            onPick={(colour) => onStyles(strokeWrites({ ...stroke, colour }))}
          />
          <NumberBox
            label="W"
            value={stroke.width}
            onChange={(width) => onStyles(strokeWrites({ ...stroke, width }))}
          />
          <select
            value={stroke.style}
            onChange={(event) => onStyles(strokeWrites({ ...stroke, style: event.target.value }))}
            className="h-7 shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1 text-[10px] outline-none"
          >
            {BORDER_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
          <span className="w-9 shrink-0 text-right text-[10px] text-white/40">
            {stroke.sides === 'all' ? 'all' : stroke.sides}
          </span>
        </Row>
      ))}

      {strokes.length === 1 && strokes[0].sides === 'all' && (
        <Preset
          onClick={() =>
            // Writing the same stroke onto each side individually is what makes
            // the list split: the four sides no longer have to move together.
            onStyles(SIDES.flatMap((side) => strokeWrites({ ...strokes[0], sides: side })))
          }
        >
          Sides apart
        </Preset>
      )}

      {strokes.length === 0 && (
        <Add label="Add a stroke" onClick={() => onStyles(strokeWrites(NEW_STROKE))} />
      )}
    </Group>
  )
}

/* ------------------------------------------------------------------ *
 * Effects
 * ------------------------------------------------------------------ */

/** Shadows, plural: a card with a ring and a lift has two, not one. */
const Effects = ({
  element,
  onStyle,
}: {
  element: HTMLElement
  onStyle: (property: string, value: string) => void
}) => {
  const shadows = readShadows(element)

  const write = (next: Shadow[]) => onStyle('box-shadow', writeShadows(next))
  const update = (index: number, patch: Partial<Shadow>) =>
    write(shadows.map((shadow, at) => (at === index ? { ...shadow, ...patch } : shadow)))

  return (
    <Group label="Effects">
      {shadows.map((shadow, index) => (
        <Row key={index} onRemove={() => write(shadows.filter((_, at) => at !== index))}>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="grid grid-cols-4 gap-1">
              <NumberBox label="X" value={shadow.x} onChange={(x) => update(index, { x })} />
              <NumberBox label="Y" value={shadow.y} onChange={(y) => update(index, { y })} />
              <NumberBox
                label="Blur"
                value={shadow.blur}
                onChange={(blur) => update(index, { blur: Math.max(0, blur) })}
              />
              <NumberBox
                label="Spr"
                value={shadow.spread}
                onChange={(spread) => update(index, { spread })}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="relative size-5 shrink-0 overflow-hidden rounded border border-white/15">
                <span className="block size-full" style={{ background: shadow.colour }} />
                <input
                  type="color"
                  aria-label="Shadow colour"
                  value={toHex(shadow.colour)}
                  onChange={(event) => update(index, { colour: event.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <Preset
                on={shadow.inset}
                onClick={() => update(index, { inset: !shadow.inset })}
              >
                Inner
              </Preset>
            </div>
          </div>
        </Row>
      ))}

      <Add label="Add a shadow" onClick={() => write([...shadows, NEW_SHADOW])} />
    </Group>
  )
}

/* ------------------------------------------------------------------ *
 * Text and image
 * ------------------------------------------------------------------ */

/** The same reading `directText` gives, so a draft can be compared with it. */
const normalise = (text: string) => text.replace(/\s+/g, ' ').trim()

/**
 * The node's own words, kept as typed while they are being typed.
 *
 * The field used to show `directText(element)` straight from the DOM, and
 * that reading trims: "Get " came back as "Get", so the space typed before
 * the next word never arrived and two words could not be typed in a row. The
 * draft is what was typed and is shown for as long as it still reads as what
 * the element holds; the element's own text takes over when it changes under
 * the field, on selecting another node or an undo.
 */
const ContentField = ({
  element,
  onText,
}: {
  element: HTMLElement
  onText: (text: string) => void
}) => {
  const value = directText(element)
  const [draft, setDraft] = useState({ element, text: value })
  const shown = draft.element === element && normalise(draft.text) === value ? draft.text : value

  return (
    <Field label="Content">
      <Textarea
        value={shown}
        onChange={(event) => {
          setDraft({ element, text: event.target.value })
          onText(event.target.value)
        }}
        rows={3}
        className="resize-none border-white/10 bg-white/[0.04] text-xs"
      />
    </Field>
  )
}

const TextSection = ({
  element,
  scale,
  swatches,
  onStyle,
  onStyles,
  onText,
}: {
  element: HTMLElement
  scale: StyleGuide['typeScale'] | undefined
  swatches: Swatch[]
  onStyle: (property: string, value: string) => void
  onStyles: (writes: StyleWrite[]) => void
  onText: (text: string) => void
}) => {
  const fontSize = Number.parseFloat(readStyle(element, 'font-size')) || 16
  const fontWeight = readStyle(element, 'font-weight') || '400'
  const align = readStyle(element, 'text-align') || 'left'
  const italic = readStyle(element, 'font-style') === 'italic'
  const underline = readStyle(element, 'text-decoration-line').includes('underline')
  const bold = Number.parseInt(fontWeight, 10) >= 600

  return (
    <Group label="Text">
      {/* Anything with words of its own, not only a node with nothing else in
          it: a button with an icon beside its label has a label to edit. */}
      {(isTextEditable(element) || directText(element) !== '') && (
        <ContentField element={element} onText={onText} />
      )}

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
                onClick={() =>
                  onStyles([
                    ['font-size', `${style.fontSize}px`],
                    ['font-weight', String(style.fontWeight)],
                    ['line-height', String(style.lineHeight)],
                    ['letter-spacing', `${style.letterSpacing}em`],
                  ])
                }
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
          <Toggle on={bold} label="Bold" onClick={() => onStyle('font-weight', bold ? '400' : '700')}>
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
            onClick={() => onStyle('text-decoration-line', underline ? 'none' : 'underline')}
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
        label="Colour"
        value={toHex(readStyle(element, 'color'))}
        swatches={swatches}
        onPick={(next) => onStyle('color', next)}
      />
    </Group>
  )
}

const ImageSection = ({
  element,
  uploading,
  onStyle,
  onAttribute,
  onUpload,
}: {
  element: HTMLElement
  uploading: boolean
  onStyle: (property: string, value: string) => void
  onAttribute: (name: string, value: string) => void
  onUpload: (file: File) => void
}) => (
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
          <Segment
            key={fit}
            on={readStyle(element, 'object-fit') === fit}
            onClick={() => onStyle('object-fit', fit)}
          >
            {fit}
          </Segment>
        ))}
      </div>
    </Field>
  </Group>
)

/* ------------------------------------------------------------------ *
 * Code and export
 * ------------------------------------------------------------------ */

/**
 * The node as markup.
 *
 * Editable, because the design is HTML and refusing to show it would be
 * pretending otherwise. What comes back goes through the same sanitiser and
 * the same replace-and-restamp path as a model's answer, so there is no way in
 * here that is not already open.
 */
const Code = ({
  element,
  onReplace,
}: {
  element: HTMLElement
  onReplace: (html: string) => void
}) => {
  const markup = nodeMarkup(element)
  const [draft, setDraft] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  return (
    <Group label="Code" defaultOpen={false}>
      <Textarea
        value={draft ?? markup}
        spellCheck={false}
        onChange={(event) => setDraft(event.target.value)}
        rows={8}
        className="resize-y border-white/10 bg-white/[0.04] font-mono text-[10px] leading-relaxed"
      />
      <div className="flex gap-1">
        <Preset
          onClick={() => {
            void navigator.clipboard?.writeText(markup)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          }}
        >
          {copied ? <Check className="size-3" /> : <Clipboard className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Preset>
        <Preset
          on={draft !== null}
          onClick={() => {
            if (draft === null) return
            onReplace(draft)
            setDraft(null)
          }}
        >
          Apply
        </Preset>
        {draft !== null && <Preset onClick={() => setDraft(null)}>Discard</Preset>}
      </div>
    </Group>
  )
}

const Export = ({
  element,
  onExport,
}: {
  element: HTMLElement
  onExport: (kind: 'html' | 'brief' | 'project') => void
}) => {
  // The generated codebase is what an account is for; a guest gets the design
  // and the brief. False outside /try, so the dashboard keeps all three.
  const { isGuest } = useGuest()
  return (
  <Group label="Export" defaultOpen={false}>
    <div className="flex flex-col gap-1">
      {!isGuest && (
        <Wide onClick={() => onExport('project')}>
          <FolderDown className="size-3.5" />
          Download as a Next.js project
        </Wide>
      )}
      <Wide onClick={() => onExport('html')}>
        <Download className="size-3.5" />
        Download the design as HTML
      </Wide>
      <Wide onClick={() => onExport('brief')}>
        <FileCode2 className="size-3.5" />
        Download it as a build brief
      </Wide>
      <Wide onClick={() => void navigator.clipboard?.writeText(nodeMarkup(element))}>
        <Clipboard className="size-3.5" />
        Copy this element&apos;s markup
      </Wide>
    </div>
  </Group>
  )
}

/* ------------------------------------------------------------------ *
 * Parts
 * ------------------------------------------------------------------ */

const Group = ({
  label,
  defaultOpen = true,
  children,
}: {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-white/[0.06] px-4 py-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 text-[10px] tracking-[0.14em] text-white/40 uppercase hover:text-white/70"
      >
        <ChevronRight
          className={cn('size-3 transition-transform', open && 'rotate-90')}
          aria-hidden
        />
        {label}
      </button>
      {open && <div className="flex flex-col gap-3 pt-3">{children}</div>}
    </section>
  )
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <span className="block text-[11px] text-white/70">{label}</span>
    {children}
  </div>
)

/** One entry in a list of fills, strokes or effects. */
const Row = ({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 rounded-md bg-white/[0.04] p-1.5">
    {children}
    <button
      type="button"
      aria-label="Remove"
      title="Remove"
      onClick={onRemove}
      className="grid size-6 shrink-0 place-items-center rounded text-white/40 transition-colors hover:bg-red-500/15 hover:text-red-400"
    >
      <Trash2 className="size-3" />
    </button>
  </div>
)

const Add = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1.5 rounded-md border border-dashed border-white/15 px-2 py-1.5 text-[11px] text-white/60 transition-colors hover:border-white/30 hover:text-white"
  >
    <Plus className="size-3" />
    {label}
  </button>
)

const Wide = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-2 rounded-md bg-white/[0.05] px-2.5 py-2 text-left text-[11px] text-white/75 transition-colors hover:bg-white/[0.12] hover:text-white"
  >
    {children}
  </button>
)

const Preset = ({
  on,
  onClick,
  children,
}: {
  on?: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={cn(
      'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors',
      on
        ? 'bg-sky-500/20 text-sky-200'
        : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.12] hover:text-white',
    )}
  >
    {children}
  </button>
)

const Segment = ({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={cn(
      'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] transition-colors',
      on ? 'bg-white/15 text-white' : 'bg-white/[0.05] text-white/60 hover:bg-white/10',
    )}
  >
    {children}
  </button>
)

const Tokens = ({
  values,
  labels,
  onPick,
}: {
  values: number[] | undefined
  labels?: string[]
  onPick: (value: number) => void
}) =>
  values && values.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {values.map((value, index) => (
        <button
          key={`${labels?.[index] ?? value}`}
          type="button"
          title={`${value}px`}
          onClick={() => onPick(value)}
          className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white"
        >
          {labels?.[index] ?? value}
        </button>
      ))}
    </div>
  ) : null

/** A small labelled number, which is most of this panel. */
const NumberBox = ({
  label,
  icon,
  value,
  disabled,
  onChange,
}: {
  label: string
  icon?: React.ReactNode
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) => (
  <label
    title={label}
    className={cn(
      'flex h-7 min-w-0 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5',
      disabled && 'opacity-45',
    )}
  >
    <span className="shrink-0 text-[10px] text-white/40">{icon ?? label}</span>
    <input
      type="number"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number.parseFloat(event.target.value) || 0)}
      className="min-w-0 flex-1 bg-transparent text-[11px] tabular-nums outline-none"
    />
  </label>
)

/**
 * A number and its unit. `auto` is a unit rather than a separate control
 * because that is how it behaves — picking it makes the number meaningless.
 */
const Size = ({
  label,
  length,
  measured,
  onChange,
}: {
  label: string
  length: { value: number; unit: string }
  measured: number
  onChange: (value: string) => void
}) => (
  <div className="space-y-1.5">
    <span className="block text-[11px] text-white/70">{label}</span>
    <div className="flex gap-1">
      <Input
        type="number"
        value={length.unit === 'auto' ? '' : length.value}
        // What it is actually rendering at, so an `auto` field is not blank.
        placeholder={String(measured)}
        disabled={length.unit === 'auto'}
        onChange={(event) =>
          onChange(`${event.target.value || 0}${length.unit === 'auto' ? 'px' : length.unit}`)
        }
        className="h-8 min-w-0 border-white/10 bg-white/[0.04] px-2 text-xs"
      />
      <select
        value={length.unit}
        onChange={(event) =>
          onChange(
            event.target.value === 'auto'
              ? 'auto'
              : `${length.unit === 'auto' ? measured : length.value}${event.target.value}`,
          )
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

const Toggle = ({
  on,
  label,
  disabled,
  onClick,
  children,
}: {
  on: boolean
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={on}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'grid size-8 place-items-center rounded-md transition-colors disabled:opacity-25',
      on ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/[0.08]',
    )}
  >
    {children}
  </button>
)

/** A colour on one line: the guide's swatches, then anything else. */
const Chip = ({
  colour,
  swatches,
  onPick,
}: {
  colour: string
  swatches: Swatch[]
  onPick: (colour: string) => void
}) => (
  <label
    title={colour}
    className="relative size-6 shrink-0 overflow-hidden rounded border border-white/15"
  >
    <span className="block size-full" style={{ background: colour }} />
    <input
      type="color"
      aria-label="Colour"
      value={toHex(colour)}
      onChange={(event) => onPick(event.target.value)}
      className="absolute inset-0 cursor-pointer opacity-0"
    />
    {swatches.length > 0 && <span className="sr-only">{swatches.length} guide colours</span>}
  </label>
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
  swatches: Swatch[]
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
    </div>

    <input
      value={value}
      spellCheck={false}
      onChange={(event) => {
        const next = event.target.value.trim()
        // Only paint a complete value — repainting on "#f" blanks the element
        // mid-keystroke, and `transparent` has to survive being typed out.
        if (/^#[0-9a-f]{6}$/i.test(next) || next === 'transparent') onPick(next)
      }}
      className="h-8 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 font-mono text-[11px] outline-none focus:border-white/25"
    />
  </Field>
)
