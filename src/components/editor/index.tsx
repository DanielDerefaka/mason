'use client'

import { ArrowLeft, Check, ChevronDown, ChevronUp, Copy, Loader2, Redo2, Trash2, Undo2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useDesignEditor } from '@/hooks/use-design-editor'
import { useGoogleFont } from '@/hooks/use-google-font'
import { sanitiseHtml } from '@/lib/sanitise'
import { cn } from '@/lib/utils'

import {
  NODE_ATTR,
  assignNodeIds,
  duplicateNode,
  findNode,
  labelFor,
  moveNode,
  serialise,
  siblingIndex,
} from './node'
import { Properties } from './properties'

/**
 * The design editor.
 *
 * A separate full-screen surface from the canvas, because the two are editing
 * different things: the canvas moves shapes around a world, this edits the
 * inside of one generated design.
 *
 * The rendered DOM is the document. Selecting walks up from the click target
 * to the nearest node carrying an id, and editing sets an inline style on that
 * node — the same mechanism the model used to write the design, so an edit is
 * indistinguishable from generated markup and survives a round trip through
 * storage.
 */
export const DesignEditor = () => {
  const { projectId, design, styleGuide, loading, status, saveHtml } = useDesignEditor()
  const { session } = useParams<{ session: string }>()

  const stage = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [tree, setTree] = useState<{ id: string; depth: number; label: string }[]>([])
  const [zoom, setZoom] = useState(1)

  /** Snapshots of the markup. The canvas's history does not reach in here. */
  const past = useRef<string[]>([])
  const future = useRef<string[]>([])
  const [historyTick, setHistoryTick] = useState(0)

  useGoogleFont(styleGuide?.typography.fontFamily, [300, 400, 500, 600, 700, 800])

  /** The guide's tokens, bound so the design's var() references resolve. */
  const cssVars = useMemo(() => {
    const vars: Record<string, string> = {}
    for (const section of styleGuide?.colorSections ?? []) {
      for (const swatch of section.swatches) vars[swatch.token] = swatch.color
    }
    if (styleGuide) vars['--font-family'] = styleGuide.typography.fontFamily
    return vars as React.CSSProperties
  }, [styleGuide])

  const readTree = useCallback(() => {
    const root = stage.current
    if (!root) return
    const rows: { id: string; depth: number; label: string }[] = []
    const walk = (element: Element, depth: number) => {
      const id = element.getAttribute(NODE_ATTR)
      if (id) rows.push({ id, depth, label: labelFor(element as HTMLElement) })
      // Deep trees are unreadable as a flat list, and the interesting nodes
      // are near the top.
      if (depth < 5) Array.from(element.children).forEach((child) => walk(child, depth + 1))
    }
    Array.from(root.children).forEach((child) => walk(child, 0))
    setTree(rows)
  }, [])

  /** Paint the stored markup once, then never re-render from React again —
   *  React re-rendering the tree would blow away the live DOM being edited. */
  const painted = useRef(false)
  useEffect(() => {
    const root = stage.current
    if (!root || painted.current || !design?.html) return
    painted.current = true
    root.innerHTML = sanitiseHtml(design.html)
    assignNodeIds(root)
    readTree()
  }, [design?.html, readTree])

  const commit = () => {
    const root = stage.current
    if (!root) return
    const html = serialise(root)
    saveHtml(html)
    setHistoryTick((tick) => tick + 1)
  }

  const snapshot = () => {
    const root = stage.current
    if (!root) return
    past.current.push(root.innerHTML)
    if (past.current.length > 60) past.current.shift()
    future.current = []
  }

  const restore = (html: string) => {
    const root = stage.current
    if (!root) return
    root.innerHTML = html
    readTree()
    commit()
  }

  const undo = () => {
    const root = stage.current
    const previous = past.current.pop()
    if (!root || previous === undefined) return
    future.current.push(root.innerHTML)
    restore(previous)
  }

  const redo = () => {
    const root = stage.current
    const next = future.current.pop()
    if (!root || next === undefined) return
    past.current.push(root.innerHTML)
    restore(next)
  }

  const selected = selectedId && stage.current ? findNode(stage.current, selectedId) : null
  const position = selected ? siblingIndex(selected) : null
  const atStart = !position || position.index <= 0
  const atEnd = !position || position.index >= position.total - 1

  const onStyle = (property: string, value: string) => {
    if (!selected) return
    snapshot()
    selected.style.setProperty(property, value)
    commit()
  }

  /**
   * Restamps ids and re-derives the selection.
   *
   * Ids are positional, so anything that changes the shape of the tree
   * invalidates them — including the id currently selected.
   */
  const restamp = (keep: HTMLElement | null) => {
    const root = stage.current
    if (!root) return
    assignNodeIds(root)
    setSelectedId(keep ? keep.getAttribute(NODE_ATTR) : null)
    readTree()
    commit()
  }

  const onDelete = () => {
    if (!selected) return
    snapshot()
    selected.remove()
    restamp(null)
  }

  const onDuplicate = () => {
    if (!selected) return
    snapshot()
    const copy = duplicateNode(selected)
    restamp(copy)
  }

  const onMove = (direction: -1 | 1) => {
    if (!selected) return
    snapshot()
    if (!moveNode(selected, direction)) return
    restamp(selected)
  }

  const onText = (text: string) => {
    if (!selected) return
    snapshot()
    selected.textContent = text
    readTree()
    commit()
  }

  /** Selection: walk up from whatever was clicked to the nearest tagged node. */
  const onStageClick = (event: React.MouseEvent) => {
    const root = stage.current
    if (!root) return
    event.preventDefault()
    // Without this the click carries on to the artboard behind, whose job is
    // to clear the selection — so every click selected and instantly
    // deselected, and only the layer list appeared to work.
    event.stopPropagation()
    let node = event.target as HTMLElement | null
    while (node && node !== root && !node.hasAttribute(NODE_ATTR)) {
      node = node.parentElement
    }
    setSelectedId(node && node !== root ? node.getAttribute(NODE_ATTR) : null)
  }

  /** Same walk as the click, so what lights up is exactly what will select. */
  const onStageHover = (event: React.MouseEvent) => {
    const root = stage.current
    if (!root) return
    let node = event.target as HTMLElement | null
    while (node && node !== root && !node.hasAttribute(NODE_ATTR)) {
      node = node.parentElement
    }
    setHoverId(node && node !== root ? node.getAttribute(NODE_ATTR) : null)
  }

  // Outline the selection without touching its own styles — a ring drawn with
  // outline cannot shift layout the way a border would.
  useEffect(() => {
    const root = stage.current
    if (!root) return
    for (const element of Array.from(root.querySelectorAll<HTMLElement>(`[${NODE_ATTR}]`))) {
      element.style.outline = ''
      element.style.outlineOffset = ''
    }
    if (hoverId && hoverId !== selectedId) {
      const node = findNode(root, hoverId)
      if (node) {
        node.style.outline = '1px solid rgba(56,189,248,0.5)'
        node.style.outlineOffset = '1px'
      }
    }
    if (selectedId) {
      const node = findNode(root, selectedId)
      if (node) {
        node.style.outline = '2px solid #38BDF8'
        node.style.outlineOffset = '1px'
      }
    }
  }, [selectedId, hoverId, historyTick])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)
      ) {
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      }
      if (event.key === 'Escape') setSelectedId(null)
      if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
        event.preventDefault()
        onDelete()
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd' && selected) {
        event.preventDefault()
        onDuplicate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /**
   * Absolute, and back to the canvas of the project being edited. A relative
   * `../canvas` resolved against whatever the current path happened to be,
   * which is how this ended up pointing at the project list.
   */
  const back = `/dashboard/${session}/canvas${projectId ? `?project=${projectId}` : ''}`

  if (loading) {
    return (
      <div className="text-muted-foreground grid min-h-screen place-items-center gap-2 text-sm">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (!design) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">That design isn&apos;t here</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            It may have been deleted from the canvas.
          </p>
          <Link
            href={back}
            className="mt-6 inline-flex items-center gap-2 text-sm text-sky-400 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to the canvas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0B0B0C]">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={back}
            aria-label="Back to the canvas"
            className="text-muted-foreground hover:text-foreground grid size-8 shrink-0 place-items-center rounded-md transition-colors hover:bg-white/[0.06]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <span className="truncate text-sm font-medium">{design.label ?? 'Design'}</span>
          <span className="text-muted-foreground shrink-0 text-[11px]">
            {status === 'saving' && 'Saving…'}
            {status === 'saved' && (
              <span className="flex items-center gap-1">
                <Check className="size-3" /> Saved
              </span>
            )}
            {status === 'unsaved' && 'Unsaved changes'}
            {status === 'error' && 'Could not save'}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <HeaderButton label="Undo" onClick={undo} disabled={past.current.length === 0}>
            <Undo2 className="size-4" />
          </HeaderButton>
          <HeaderButton label="Redo" onClick={redo} disabled={future.current.length === 0}>
            <Redo2 className="size-4" />
          </HeaderButton>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <select
            aria-label="Zoom"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] outline-none"
          >
            {[0.5, 0.75, 1, 1.25, 1.5].map((level) => (
              <option key={level} value={level}>
                {Math.round(level * 100)}%
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Layers */}
        <aside className="hidden w-[210px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.08] py-2 md:flex">
          <span className="px-3 pb-2 text-[10px] tracking-[0.14em] text-white/40 uppercase">
            Layers
          </span>
          {tree.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedId(row.id)}
              onMouseEnter={() => setHoverId(row.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{ paddingLeft: 12 + row.depth * 12 }}
              className={cn(
                // shrink-0: these are flex children in a fixed-height column,
                // and without it sixty rows compress into each other rather
                // than overflowing into the scroll.
                'shrink-0 truncate py-1.5 pr-3 text-left text-[12px] transition-colors',
                selectedId === row.id
                  ? 'bg-white/[0.12] text-white'
                  : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
              )}
            >
              {row.label}
            </button>
          ))}
        </aside>

        {/* Artboard */}
        <main
          className="min-w-0 flex-1 overflow-auto p-8"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
          onClick={() => setSelectedId(null)}
        >
          <div
            className="mx-auto origin-top shadow-2xl"
            style={{ width: design.width, transform: `scale(${zoom})` }}
          >
            <div
              ref={stage}
              onClick={onStageClick}
              onMouseOver={onStageHover}
              onMouseLeave={() => setHoverId(null)}
              style={cssVars}
              className="[&_*]:cursor-pointer"
            />
          </div>
        </main>

        {/* Properties */}
        <aside className="w-[264px] shrink-0 overflow-y-auto border-l border-white/[0.08]">
          {selected ? (
            <>
              <div className="flex items-center gap-1 border-b border-white/[0.08] px-3 py-2">
                <span className="text-muted-foreground mr-auto truncate text-[11px]">
                  {labelFor(selected)}
                </span>
                <NodeAction label="Move up" onClick={() => onMove(-1)} disabled={atStart}>
                  <ChevronUp className="size-3.5" />
                </NodeAction>
                <NodeAction label="Move down" onClick={() => onMove(1)} disabled={atEnd}>
                  <ChevronDown className="size-3.5" />
                </NodeAction>
                <NodeAction label="Duplicate" onClick={onDuplicate}>
                  <Copy className="size-3.5" />
                </NodeAction>
                <NodeAction label="Delete" onClick={onDelete} danger>
                  <Trash2 className="size-3.5" />
                </NodeAction>
              </div>
                <Properties
                element={selected}
                guide={styleGuide}
                onStyle={onStyle}
                onText={onText}
              />
            </>
          ) : (
            <p className="text-muted-foreground p-4 text-xs leading-relaxed">
              Click anything in the design to edit it — a heading, a button, a card. Its
              properties appear here.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

const NodeAction = ({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'grid size-7 place-items-center rounded-md transition-colors disabled:opacity-25',
      danger
        ? 'text-red-400 hover:bg-red-500/15'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.08]',
    )}
  >
    {children}
  </button>
)

const HeaderButton = ({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className="text-muted-foreground hover:text-foreground grid size-8 place-items-center rounded-md transition-colors hover:bg-white/[0.06] disabled:opacity-30"
  >
    {children}
  </button>
)

export default DesignEditor
