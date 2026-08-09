'use client'

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useDesignEditor } from '@/hooks/use-design-editor'
import { useGoogleFont } from '@/hooks/use-google-font'
import { sanitiseHtml } from '@/lib/sanitise'
import { cn } from '@/lib/utils'

import { useMutation } from 'convex/react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import {
  NODE_ATTR,
  assignNodeIds,
  canEditInline,
  stripRings,
  duplicateNode,
  findNode,
  labelFor,
  moveNode,
  serialise,
  siblingIndex,
} from './node'
import { AiPanel } from './ai'
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
  const [uploading, setUploading] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
  const resolveStorageUrl = useMutation(api.moodboard.resolveStorageUrl)
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
    // Designs saved before the ring was stripped on the way out still carry
    // one; clear it on the way in so it is gone after the next save.
    stripRings(root)
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

  const onAttribute = (name: string, value: string) => {
    if (!selected) return
    snapshot()
    selected.setAttribute(name, value)
    commit()
  }

  /**
   * Uploads a file and points the selected image at it.
   *
   * Stored rather than inlined as a data URL: a logo inlined at base64 lands
   * in the design's markup, which is then carried through every save, every
   * export and every prompt sent to the model.
   */
  const onUpload = async (file: File) => {
    if (!selected) return
    if (!file.type.startsWith('image/')) {
      toast.error('That is not an image')
      return
    }
    if (file.size > 5_000_000) {
      toast.error('Images need to be under 5MB')
      return
    }

    setUploading(true)
    try {
      const url = await generateUploadUrl({})
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!response.ok) throw new Error('upload failed')
      const { storageId } = (await response.json()) as { storageId: string }
      const served = await resolveStorageUrl({ storageId })
      if (!served) throw new Error('no url')

      snapshot()
      selected.setAttribute('src', served)
      commit()
      toast.success('Image replaced')
    } catch {
      toast.error('Could not upload that image')
    } finally {
      setUploading(false)
    }
  }

  /**
   * Sends the selected element to the model and swaps in what comes back.
   *
   * The response replaces the element outright, so its id is restamped and the
   * selection re-derived — the returned markup is a different node object even
   * when it looks identical.
   */
  const onAsk = async (instruction: string) => {
    if (!selected || !projectId) return
    setAsking(true)
    const target = selected

    try {
      const response = await fetch('/api/generate/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, instruction, html: target.outerHTML }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        toast.error(body?.message ?? 'Could not apply that')
        return
      }

      const markup = sanitiseHtml((await response.text()).replace(/^```html\s*|```\s*$/g, ''))
      const holder = document.createElement('div')
      holder.innerHTML = markup
      const replacement = holder.firstElementChild as HTMLElement | null
      if (!replacement) {
        toast.error('The model returned nothing usable')
        return
      }

      snapshot()
      target.replaceWith(replacement)
      restamp(replacement)
      toast.success('Applied')
    } catch {
      toast.error('Could not reach the model')
    } finally {
      setAsking(false)
    }
  }

  /** Double-click types straight into the design rather than the side panel. */
  const onStageDoubleClick = (event: React.MouseEvent) => {
    const root = stage.current
    if (!root) return
    let node = event.target as HTMLElement | null
    while (node && node !== root && !node.hasAttribute(NODE_ATTR)) node = node.parentElement
    if (!node || node === root || !canEditInline(node)) return

    event.stopPropagation()
    setSelectedId(node.getAttribute(NODE_ATTR))
    snapshot()

    node.contentEditable = 'true'
    node.focus()
    // Put the caret where the pointer landed rather than at the start.
    const selection = window.getSelection()
    const range = document.caretRangeFromPoint?.(event.clientX, event.clientY)
    if (selection && range) {
      selection.removeAllRanges()
      selection.addRange(range)
    }

    const finish = () => {
      node.removeAttribute('contenteditable')
      node.removeEventListener('blur', finish)
      readTree()
      commit()
    }
    node.addEventListener('blur', finish)
  }

  /** Right-click selects what is under the pointer, then offers its actions. */
  const onStageContextMenu = (event: React.MouseEvent) => {
    const root = stage.current
    if (!root) return
    event.preventDefault()
    event.stopPropagation()

    let node = event.target as HTMLElement | null
    while (node && node !== root && !node.hasAttribute(NODE_ATTR)) node = node.parentElement
    if (node && node !== root) setSelectedId(node.getAttribute(NODE_ATTR))
    setMenu({ x: event.clientX, y: event.clientY })
  }

  /** Drops a dragged layer next to the one it was released on. */
  const onDropLayer = (targetId: string) => {
    const root = stage.current
    if (!root || !dragId || dragId === targetId) return
    const moving = findNode(root, dragId)
    const target = findNode(root, targetId)
    setDragId(null)
    if (!moving || !target || moving.contains(target)) return

    snapshot()
    target.parentElement?.insertBefore(moving, target)
    restamp(moving)
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
              draggable
              onDragStart={() => setDragId(row.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDropLayer(row.id)}
              onDragEnd={() => setDragId(null)}
              style={{ paddingLeft: 12 + row.depth * 12 }}
              className={cn(
                // shrink-0: these are flex children in a fixed-height column,
                // and without it sixty rows compress into each other rather
                // than overflowing into the scroll.
                'shrink-0 cursor-grab truncate py-1.5 pr-3 text-left text-[12px] transition-colors active:cursor-grabbing',
                dragId === row.id && 'opacity-40',
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
              onDoubleClick={onStageDoubleClick}
              onContextMenu={onStageContextMenu}
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
                onAttribute={onAttribute}
                onUpload={(file) => void onUpload(file)}
                uploading={uploading}
              />
              <AiPanel
                label={labelFor(selected)}
                busy={asking}
                onAsk={(instruction) => void onAsk(instruction)}
              />
            </>
          ) : (
            <p className="text-muted-foreground p-4 text-xs leading-relaxed">
              Click anything to edit it. Double-click text to type over it in place, and
              drag a layer to move it.
            </p>
          )}
        </aside>
      </div>

      {menu && selected && (
        <>
          {/* A full-screen catcher, so any click anywhere dismisses the menu. */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault()
              setMenu(null)
            }}
          />
          <div
            className="fixed z-50 w-48 overflow-hidden rounded-lg border border-white/10 bg-[#17171A] py-1 shadow-2xl"
            style={{
              // Kept inside the viewport — a right-click near the bottom edge
              // would otherwise open a menu half off-screen.
              left: Math.min(menu.x, window.innerWidth - 200),
              top: Math.min(menu.y, window.innerHeight - 240),
            }}
          >
            <MenuItem
              onClick={() => {
                setMenu(null)
                document.querySelector<HTMLTextAreaElement>('aside textarea')?.focus()
              }}
            >
              <Sparkles className="size-3.5" />
              Ask AI…
            </MenuItem>
            <MenuItem onClick={() => { setMenu(null); onDuplicate() }}>
              <Copy className="size-3.5" />
              Duplicate
            </MenuItem>
            <MenuItem onClick={() => { setMenu(null); onMove(-1) }} disabled={atStart}>
              <ChevronUp className="size-3.5" />
              Move up
            </MenuItem>
            <MenuItem onClick={() => { setMenu(null); onMove(1) }} disabled={atEnd}>
              <ChevronDown className="size-3.5" />
              Move down
            </MenuItem>
            <span className="my-1 block h-px bg-white/10" />
            <MenuItem onClick={() => { setMenu(null); undo() }} disabled={past.current.length === 0}>
              <Undo2 className="size-3.5" />
              Undo
            </MenuItem>
            <MenuItem onClick={() => { setMenu(null); redo() }} disabled={future.current.length === 0}>
              <Redo2 className="size-3.5" />
              Redo
            </MenuItem>
            <span className="my-1 block h-px bg-white/10" />
            <MenuItem onClick={() => { setMenu(null); onDelete() }} danger>
              <Trash2 className="size-3.5" />
              Delete
            </MenuItem>
          </div>
        </>
      )}
    </div>
  )
}

const MenuItem = ({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors disabled:opacity-30',
      danger ? 'text-red-400 hover:bg-red-500/15' : 'text-white/80 hover:bg-white/[0.08]',
    )}
  >
    {children}
  </button>
)

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
