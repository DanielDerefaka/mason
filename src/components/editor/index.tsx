'use client'

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Crosshair,
  Heading,
  Image as ImageIcon,
  Loader2,
  Minus,
  Play,
  Plus,
  RectangleHorizontal,
  Redo2,
  SeparatorHorizontal,
  Component,
  Sparkles,
  X,
  Square,
  Type as TypeIcon,
  Trash2,
  Undo2,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useGuest } from '@/components/try/guest-context'
import { useDesignEditor } from '@/hooks/use-design-editor'
import { useGoogleFont } from '@/hooks/use-google-font'
import { canvasPathOf, useWorkspacePath } from '@/hooks/use-workspace-path'
import { track } from '@/lib/analytics'
import { DESIGN_SCOPE, sanitiseHtml } from '@/lib/sanitise'
import { generateFetch } from '@/lib/try/generate-fetch'
import { cn } from '@/lib/utils'

import { useMutation } from 'convex/react'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import {
  COMPONENT_ATTR,
  NODE_ATTR,
  ancestorIds,
  applyWrites,
  assignNodeIds,
  buildLayerRows,
  canAcceptDrop,
  canDropLayer,
  canEditInline,
  componentAncestor,
  directText,
  componentName,
  componentsIn,
  pushToInstances,
  setComponentName,
  defaultExpanded,
  describeAncestors,
  dropLayer,
  stripRings,
  duplicateNode,
  findNode,
  insertNode,
  labelFor,
  canHostChildren,
  isRowLayout,
  lockedAncestor,
  moveNode,
  nodeMarkup,
  readStyle,
  renameNode,
  sectionScope,
  serialise,
  setHidden,
  setLocked,
  siblingIndex,
  sizeWrites,
  type DropWhere,
  type InsertKind,
  type StyleWrite,
} from './node'
import { AiPanel } from './ai'
import { nodeAnswer } from './answer'
import { Layers } from './layers'
import { ShareButton } from './share'
import { Properties } from './properties'
import { exportDesignHtml, exportDesignPrompt, exportDesignProject } from '@/lib/export'

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
  const workspace = useWorkspacePath()
  const { requireExport } = useGuest()

  const stage = useRef<HTMLDivElement>(null)
  const artboard = useRef<HTMLDivElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const pendingScroll = useRef<{
    x: number
    y: number
    anchorX: number
    anchorY: number
    ratio: number
  } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [asking, setAsking] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [hoverBox, setHoverBox] = useState<Box | null>(null)
  const [resizing, setResizing] = useState(false)
  const [draggingNode, setDraggingNode] = useState(false)
  /** The dock is dismissible: it sits over the design and is not always wanted. */
  const [aiOpen, setAiOpen] = useState(false)
  const [dropLine, setDropLine] = useState<
    { left: number; top: number; width: number; height: number } | null
  >(null)

  const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
  const resolveStorageUrl = useMutation(api.moodboard.resolveStorageUrl)
  const [zoom, setZoom] = useState(1)

  /**
   * The layer tree is derived, not stored.
   *
   * The DOM is the document, so the rows are rebuilt from it whenever it
   * changes — `treeTick` is the signal that it has. What is state here is what
   * the DOM cannot say: which groups are open.
   */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [treeTick, setTreeTick] = useState(0)
  /**
   * The page's sections, for the AI panel's `/name` addressing.
   *
   * The outermost run of elements only — descending further lists every card
   * on the page, which is an inventory rather than a set of destinations.
   * `sectionScope` finds where that run actually starts: a generated design
   * wraps everything in one div, so reading the stage's own children offered
   * exactly one destination, called "Group".
   */
  const sections = useMemo(() => {
    const root = stage.current
    if (!root) return []
    return Array.from(sectionScope(root).children).flatMap((child) => {
      const node = child as HTMLElement
      const id = node.getAttribute(NODE_ATTR)
      return id ? [{ id, name: labelFor(node) }] : []
    })
    // Recomputed whenever the tree is restamped, same as the layer rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeTick])

  const rows = useMemo(
    () => (stage.current ? buildLayerRows(stage.current, expanded) : []),
    // treeTick is the dependency that matters; the DOM read is deliberate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expanded, treeTick],
  )

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

  /** Re-reads the tree out of the DOM. Cheap, and always right. */
  const readTree = useCallback(() => setTreeTick((tick) => tick + 1), [])

  /** Paint the stored markup once, then never re-render from React again —
   *  React re-rendering the tree would blow away the live DOM being edited. */
  const painted = useRef(false)
  useEffect(() => {
    const root = stage.current
    if (!root || painted.current || !design?.html) return
    painted.current = true
    // The design's own stylesheet is confined beneath this class, so the
    // editing surface has to carry it or every scoped rule misses.
    root.classList.add(DESIGN_SCOPE)
    root.innerHTML = sanitiseHtml(design.html)
    // Designs saved before the ring was stripped on the way out still carry
    // one; clear it on the way in so it is gone after the next save.
    stripRings(root)
    assignNodeIds(root)
    setExpanded(defaultExpanded(root))
    readTree()
  }, [design?.html, readTree])

  /**
   * Reveals the selection in the tree.
   *
   * Clicking something three levels down on the artboard has to open the
   * groups above it, or the layer list is showing a selection that is not in
   * it. Ids are positional paths, so a node's ancestors are its own id's
   * prefixes and there is nothing to walk.
   */
  useEffect(() => {
    if (!selectedId) return
    const ancestors = ancestorIds(selectedId)
    if (ancestors.length === 0) return
    setExpanded((current) => {
      if (ancestors.every((id) => current.has(id))) return current
      const next = new Set(current)
      for (const id of ancestors) next.add(id)
      return next
    })
  }, [selectedId])

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
  const selectionLocked =
    selected && stage.current ? lockedAncestor(selected, stage.current) !== null : false

  /**
   * The component the selection is, or is part of.
   *
   * Read from the DOM on every render like everything else here, so it is
   * right immediately after a component is made rather than after the next
   * event.
   */
  const componentRoot =
    selected && stage.current ? componentAncestor(selected, stage.current) : null
  const components = useMemo(
    () => (stage.current ? componentsIn(stage.current) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [treeTick, historyTick],
  )

  const onStyle = (property: string, value: string) => {
    if (!selected) return
    snapshot()
    selected.style.setProperty(property, value)
    commit()
  }

  /**
   * Several declarations as one edit.
   *
   * A fixed width on a flex child is three properties and a fill that is
   * removed is two; written one at a time they would be three undo steps and
   * two, which is not what the user did.
   */
  const onStyles = (writes: StyleWrite[]) => {
    if (!selected || writes.length === 0) return
    snapshot()
    applyWrites(selected, writes)
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

  /** Adds an element after the selection, then selects what it made. */
  const onInsert = (kind: InsertKind) => {
    const root = stage.current
    if (!root) return
    snapshot()
    const node = insertNode(root, kind, selected)
    restamp(node)
    if (node) node.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
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
    if (!projectId) return

    // The panel is always on screen now, so it can be typed into with nothing
    // chosen. Saying what is missing beats doing nothing.
    if (!selected) {
      toast.error('Nothing is selected', {
        description: 'Click a part of the design, or type / to pick a section by name.',
      })
      return
    }
    setAsking(true)
    const target = selected
    const root = stage.current

    try {
      const response = await generateFetch('/api/generate/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          instruction,
          // Without the positional ids: they are restamped on the way back in,
          // and the model was being told to preserve a data attribute it
          // should never have seen.
          html: nodeMarkup(target),
          // The element's states and breakpoints live in the page's one
          // stylesheet and select by class, and its width and background are
          // the container's call. Sent as reference so the model stops
          // dropping the class and styling a card as if it were the page.
          context: {
            stylesheet: root?.querySelector('style')?.textContent ?? undefined,
            ancestors: root ? describeAncestors(target, root) : undefined,
          },
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null
        toast.error(body?.message ?? 'Could not apply that')
        return
      }

      // Decided before anything is snapshotted or replaced. A response the
      // route marked as cut off still parses to one valid element, so it used
      // to replace a whole page with the top third of it and say Applied.
      const answer = nodeAnswer(await response.text())
      if (answer.kind === 'truncated') {
        toast.error('The model ran out of room', {
          description: 'Nothing was changed. Try a smaller selection or a shorter instruction.',
        })
        return
      }
      if (answer.kind === 'empty') {
        toast.error('The model returned nothing', {
          description: 'Nothing was changed. Try again, or say more about what you want.',
        })
        return
      }

      const markup = sanitiseHtml(answer.html)
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

  /**
   * The node an event on the artboard is about.
   *
   * A locked node answers nothing: the lock is what stops a finished section
   * being picked up by a stray click, so the same walk that finds what to
   * select has to be the one that refuses. It stays reachable from the layer
   * tree, which is where it can be unlocked.
   */
  const nodeFor = (target: EventTarget | null): HTMLElement | null => {
    const root = stage.current
    if (!root) return null
    let node = target as HTMLElement | null
    while (node && node !== root && !node.hasAttribute(NODE_ATTR)) node = node.parentElement
    if (!node || node === root) return null
    return lockedAncestor(node, root) ? null : node
  }

  /** Double-click types straight into the design rather than the side panel. */
  const onStageDoubleClick = (event: React.MouseEvent) => {
    const node = nodeFor(event.target)
    if (!node) return
    if (!canEditInline(node)) {
      // Refusing without saying so is what made this look broken. Only for a
      // node that holds text of its own — double-clicking a container is a
      // way of reaching into it, not a failed edit.
      if (directText(node)) {
        toast.message('This one has to be edited in the panel', {
          description: 'It holds more than a single run of text.',
        })
      }
      return
    }

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

  /**
   * Drags a handle to a new size.
   *
   * Only the right edge, bottom edge and their corner: the design is a flow
   * layout, so dragging a left or top edge would have to compensate with a
   * margin to keep the element still, and a handle that moves the thing you
   * are trying to resize is worse than no handle.
   */
  const onResizeStart = (edge: 'e' | 's' | 'se') => (event: React.PointerEvent) => {
    const root = stage.current
    if (!root || !selectedId) return
    const node = findNode(root, selectedId)
    if (!node) return

    event.preventDefault()
    event.stopPropagation()
    ;(event.target as Element).setPointerCapture?.(event.pointerId)

    snapshot()
    setResizing(true)

    const rect = node.getBoundingClientRect()
    const start = {
      x: event.clientX,
      y: event.clientY,
      width: rect.width / zoom,
      height: rect.height / zoom,
    }

    const onMove = (move: PointerEvent) => {
      /**
       * Sized through `sizeWrites` rather than by setting width directly.
       *
       * A flex child's width loses to its flex-basis, and a sibling with
       * `flex: 1` takes the space back on the next layout pass — so dragging
       * the handle of a card in a row either did nothing or left the row
       * broken behind it. Along the parent's axis the drag writes a basis the
       * container is told to hold.
       */
      if (edge !== 's') {
        const width = Math.max(8, start.width + (move.clientX - start.x) / zoom)
        applyWrites(node, sizeWrites(node, 'width', `${Math.round(width)}px`))
        // A flex item defaults to min-width:auto, which refuses to go below
        // its content — so dragging a handle inwards did nothing at all until
        // the floor was removed.
        node.style.minWidth = '0'
      }
      if (edge !== 'e') {
        const height = Math.max(8, start.height + (move.clientY - start.y) / zoom)
        applyWrites(node, sizeWrites(node, 'height', `${Math.round(height)}px`))
        node.style.minHeight = '0'
      }
      setBox(measure(selectedId))
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setResizing(false)
      commit()
      setBox(measure(selectedId))
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /**
   * Drags the selection.
   *
   * Two modes, because a generated design is a flow layout and "move this
   * anywhere" means two different things in one. An element that is
   * absolutely positioned gets its offsets moved — genuinely free placement.
   * Everything else is reordered into a new place in the flow, with a line
   * showing where it will land, because setting `left` on a flow element does
   * nothing and setting `position:absolute` behind the user's back collapses
   * the space it was holding open.
   */
  const onMoveStart = (event: React.PointerEvent, node: HTMLElement) => {
    const root = stage.current
    if (!root) return
    snapshot()

    const free = ['absolute', 'fixed'].includes(readStyle(node, 'position'))
    const start = {
      x: event.clientX,
      y: event.clientY,
      left: Number.parseFloat(readStyle(node, 'left')) || 0,
      top: Number.parseFloat(readStyle(node, 'top')) || 0,
    }

    let target: { node: HTMLElement; before: boolean } | null = null
    setDraggingNode(true)

    const onMove = (move: PointerEvent) => {
      if (free) {
        node.style.left = `${Math.round(start.left + (move.clientX - start.x) / zoom)}px`
        node.style.top = `${Math.round(start.top + (move.clientY - start.y) / zoom)}px`
        setBox(measure(selectedId))
        return
      }

      // Hit-test through the overlay, which is why it is pointer-events-none.
      let under = document.elementFromPoint(move.clientX, move.clientY) as HTMLElement | null
      while (under && under !== root && !under.hasAttribute(NODE_ATTR)) {
        under = under.parentElement
      }
      if (!under || under === root || under === node || node.contains(under)) {
        target = null
        setDropLine(null)
        return
      }

      /**
       * The drop has to land somewhere that can hold it.
       *
       * Previously any node under the pointer was accepted and the element was
       * inserted into that node's parent — so dragging a card across a nav
       * dropped the card *into* the nav, and the layout scattered. A generated
       * design is a flow layout, and a flow layout has containers that know how
       * to arrange children and elements that do not.
       *
       * Walk outward until the parent is something that can genuinely host a
       * child, and refuse rather than guess when nothing qualifies.
       */
      while (under && under !== root) {
        const parent: HTMLElement | null = under.parentElement
        if (!parent) break
        if (parent === root || canHostChildren(parent)) break
        under = parent
      }

      if (!under || under === root || under === node || node.contains(under)) {
        target = null
        setDropLine(null)
        return
      }

      const container = under.parentElement
      const rect = under.getBoundingClientRect()

      /**
       * Which side of the target counts as "before" depends on how the
       * container lays its children out. In a row, the answer is left/right and
       * the indicator is a vertical bar; judging a row by the pointer's Y put
       * the element on the wrong side about half the time. ^[inferred]
       */
      const row = container ? isRowLayout(container) : false
      const before = row
        ? move.clientX < rect.left + rect.width / 2
        : move.clientY < rect.top + rect.height / 2
      target = { node: under, before }

      const wrap = artboard.current
      if (!wrap) return
      const w = wrap.getBoundingClientRect()
      setDropLine(
        row
          ? {
              left: ((before ? rect.left : rect.right) - w.left) / zoom,
              top: (rect.top - w.top) / zoom,
              width: 2 / zoom,
              height: rect.height / zoom,
            }
          : {
              left: (rect.left - w.left) / zoom,
              top: ((before ? rect.top : rect.bottom) - w.top) / zoom,
              width: rect.width / zoom,
              height: 2 / zoom,
            },
      )
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDropLine(null)
      setDraggingNode(false)

      if (free) {
        commit()
        setBox(measure(selectedId))
        return
      }
      if (!target) return
      target.node.parentElement?.insertBefore(
        node,
        target.before ? target.node : target.node.nextSibling,
      )
      restamp(node)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const MIN_ZOOM = 0.1
  const MAX_ZOOM = 4
  const clampZoom = (level: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level))

  /**
   * Zooms about a point on screen, keeping whatever is under the pointer
   * under the pointer. Without the scroll correction the artboard slides
   * away as it grows and you lose the thing you were zooming into.
   */
  const zoomAt = useCallback(
    (next: number, clientX: number, clientY: number) => {
      const view = viewport.current
      if (!view) return
      const level = clampZoom(next)
      if (level === zoom) return

      const rect = view.getBoundingClientRect()
      pendingScroll.current = {
        x: clientX - rect.left + view.scrollLeft,
        y: clientY - rect.top + view.scrollTop,
        anchorX: clientX - rect.left,
        anchorY: clientY - rect.top,
        ratio: level / zoom,
      }
      setZoom(level)
    },
    [zoom],
  )

  /**
   * Applies the scroll correction before the browser paints.
   *
   * Doing it in requestAnimationFrame meant the artboard was drawn once at the
   * new zoom and the old scroll, then corrected — one wrong frame per wheel
   * event, which is what the shake was.
   */
  useLayoutEffect(() => {
    const view = viewport.current
    const pending = pendingScroll.current
    if (!view || !pending) return
    pendingScroll.current = null
    view.scrollLeft = pending.x * pending.ratio - pending.anchorX
    view.scrollTop = pending.y * pending.ratio - pending.anchorY
  }, [zoom])

  /** Fits the selected element, or the whole design when nothing is selected. */
  const zoomToSelection = useCallback(() => {
    const view = viewport.current
    const wrap = artboard.current
    const root = stage.current
    if (!view || !wrap || !root) return

    const node = selectedId ? findNode(root, selectedId) : null
    const target = node ?? root
    const rect = target.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    // Current on-screen size divided out, so this works from any zoom.
    const width = rect.width / zoom
    const height = rect.height / zoom
    const margin = 0.85
    const level = clampZoom(
      Math.min((view.clientWidth * margin) / width, (view.clientHeight * margin) / height),
    )

    const wrapRect = wrap.getBoundingClientRect()
    const offsetX = (rect.left - wrapRect.left) / zoom
    const offsetY = (rect.top - wrapRect.top) / zoom

    setZoom(level)
    requestAnimationFrame(() => {
      const artboardLeft = wrap.offsetLeft
      view.scrollLeft = artboardLeft + offsetX * level - (view.clientWidth - width * level) / 2
      view.scrollTop = offsetY * level - (view.clientHeight - height * level) / 2
    })
  }, [selectedId, zoom])

  /**
   * Wheel zoom.
   *
   * Attached through a callback ref rather than an effect: the editor renders
   * a loading state first, so an effect keyed on zoom ran once while the
   * viewport was still null and never ran again — the listener was never
   * attached and only the buttons worked.
   */
  const wheelRef = useRef<((event: WheelEvent) => void) | null>(null)

  const attachViewport = useCallback((node: HTMLDivElement | null) => {
    if (viewport.current && wheelRef.current) {
      viewport.current.removeEventListener('wheel', wheelRef.current)
    }
    viewport.current = node
    if (!node) return

    const onWheel = (event: WheelEvent) => {
      // A trackpad pinch arrives as a wheel event with ctrlKey set. A plain
      // two-finger scroll is left alone so the artboard can still be panned.
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      // Exponential and gentle. A linear factor makes one flick of a trackpad
      // jump several hundred per cent, and the clamp keeps a single coarse
      // mouse-wheel notch from doing the same.
      const delta = Math.max(-40, Math.min(40, event.deltaY))
      zoomAtRef.current(event.deltaY === 0 ? 1 : Math.exp(-delta * 0.004), event.clientX, event.clientY)
    }

    wheelRef.current = onWheel
    // Not passive: the browser will not let a passive listener preventDefault,
    // and without that the page zooms instead of the artboard.
    node.addEventListener('wheel', onWheel, { passive: false })
  }, [])

  /**
   * The handler is attached once, so it reads the current zoom through a ref
   * rather than closing over a stale one.
   */
  const zoomAtRef = useRef<(factor: number, x: number, y: number) => void>(() => {})
  zoomAtRef.current = (factor, x, y) => zoomAt(zoom * factor, x, y)

  /** Right-click selects what is under the pointer, then offers its actions. */
  const onStageContextMenu = (event: React.MouseEvent) => {
    if (!stage.current) return
    event.preventDefault()
    event.stopPropagation()

    const node = nodeFor(event.target)
    if (node) setSelectedId(node.getAttribute(NODE_ATTR))
    setMenu({ x: event.clientX, y: event.clientY })
  }

  /**
   * Drops a dragged layer beside or inside the one it was released on.
   *
   * Every one of these reshapes the tree, so the ids are restamped and the
   * selection re-derived rather than carried across — the node that moved has
   * a different path afterwards, and so does everything it moved past.
   */
  const onDropLayer = (movingId: string, targetId: string, where: DropWhere) => {
    const root = stage.current
    if (!root) return
    const moving = findNode(root, movingId)
    const target = findNode(root, targetId)
    // Asked before the snapshot, so a refused drop does not leave an undo
    // step for something that did not happen.
    if (!moving || !target || !canDropLayer(moving, target, where)) return

    snapshot()
    dropLayer(moving, target, where)
    restamp(moving)
  }

  const onToggleLayer = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  /** Hiding, locking and renaming all write onto the node, so all persist. */
  const onHideLayer = (id: string, hidden: boolean) => {
    const node = stage.current && findNode(stage.current, id)
    if (!node) return
    snapshot()
    setHidden(node, hidden)
    readTree()
    commit()
  }

  const onLockLayer = (id: string, locked: boolean) => {
    const node = stage.current && findNode(stage.current, id)
    if (!node) return
    snapshot()
    setLocked(node, locked)
    readTree()
    commit()
  }

  const onRenameLayer = (id: string, name: string) => {
    const node = stage.current && findNode(stage.current, id)
    if (!node || name === labelFor(node)) return
    snapshot()
    renameNode(node, name)
    readTree()
    commit()
  }

  /**
   * Turns the selection into a component.
   *
   * Named from its layer label rather than from a dialogue: the name is
   * editable in the panel and in the tree straight afterwards, and a modal
   * between "I want this to be a component" and it being one is a step nobody
   * wants twice.
   */
  const onCreateComponent = () => {
    if (!selected) return
    snapshot()
    setComponentName(selected, labelFor(selected))
    readTree()
    commit()
    toast.success('Component created', {
      description: 'Rename it in the panel. It exports as a file of its own.',
    })
  }

  const onRenameComponent = (name: string) => {
    if (!componentRoot || name === componentName(componentRoot)) return
    snapshot()
    setComponentName(componentRoot, name)
    readTree()
    commit()
  }

  /** Removes the name, leaving the markup exactly where it was. */
  const onDetachComponent = () => {
    if (!componentRoot) return
    snapshot()
    setComponentName(componentRoot, '')
    readTree()
    commit()
  }

  const onPushToInstances = () => {
    const root = stage.current
    if (!root || !componentRoot) return
    snapshot()
    const changed = pushToInstances(root, componentRoot)
    if (changed === 0) {
      past.current.pop()
      toast.message('Nothing to update', { description: 'This is the only instance.' })
      return
    }
    restamp(componentRoot)
    toast.success(`Updated ${changed} other instance${changed === 1 ? '' : 's'}`)
  }

  /** Places another instance of a component after the selection. */
  const onInsertComponent = (name: string) => {
    const root = stage.current
    if (!root) return
    const source = root.querySelector<HTMLElement>(
      `[${COMPONENT_ATTR}="${CSS.escape(name)}"]`,
    )
    if (!source) return

    snapshot()
    const copy = source.cloneNode(true) as HTMLElement
    const after = selected && !source.contains(selected) ? selected : null
    if (after?.parentElement) after.parentElement.insertBefore(copy, after.nextSibling)
    else root.append(copy)
    restamp(copy)
    copy.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  /** Whether a row will take a layer dropped into the middle of it. */
  const canDropInside = (id: string) => {
    const node = stage.current && findNode(stage.current, id)
    return node ? canAcceptDrop(node) : false
  }

  /**
   * Markup typed into the inspector's code view.
   *
   * The same path a model's answer takes — sanitised, swapped in, restamped —
   * because it is the same kind of input: HTML from outside the editor.
   */
  const onReplace = (html: string) => {
    if (!selected) return
    const holder = document.createElement('div')
    holder.innerHTML = sanitiseHtml(html)
    const replacement = holder.firstElementChild as HTMLElement | null
    if (!replacement) {
      toast.error('That is not markup this can use')
      return
    }
    snapshot()
    selected.replaceWith(replacement)
    restamp(replacement)
  }

  const onExport = async (kind: 'html' | 'brief' | 'project') => {
    if (!design) return
    track('export_clicked', { kind })
    // Every download asks the gate first — during the free week that is one
    // email address, once per session; outside /try it resolves true at once.
    // Asked before the DOM is serialised so a closed dialog costs nothing.
    if (!(await requireExport())) return
    // Exported from the live DOM rather than the last save, so a download
    // taken mid-edit is the design on screen.
    const current = stage.current ? { ...design, html: serialise(stage.current) } : design
    if (kind === 'html') exportDesignHtml(current, styleGuide)
    else if (kind === 'brief') exportDesignPrompt(current, styleGuide)
    else {
      const files = exportDesignProject(current, styleGuide)
      toast.success('Next.js project exported', {
        description: `${files.length} files. npm install, then npm run dev.`,
      })
    }
  }

  const onText = (text: string) => {
    if (!selected) return
    snapshot()
    selected.textContent = text
    readTree()
    commit()
  }

  /**
   * Starts a drag only once the pointer has actually travelled.
   *
   * The move handle used to be a transparent span over the whole selection,
   * which swallowed the double-click that puts the caret in text. Dragging
   * begins from the element itself now, and a press that does not move is
   * left alone so click, double-click and typing all still reach it.
   */
  const DRAG_THRESHOLD = 4

  const onStagePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return

    const node = nodeFor(event.target)
    if (!node) return
    // Typing beats dragging while a node is open for editing.
    if (node.isContentEditable) return
    // A press on something not yet selected still starts a drag — requiring a
    // separate click first meant an element you could see could not be moved
    // until you had clicked it, which is not how a canvas behaves.
    const id = node.getAttribute(NODE_ATTR)
    if (id && id !== selectedId) setSelectedId(id)

    const origin = { x: event.clientX, y: event.clientY }
    const held = node

    const maybeStart = (move: PointerEvent) => {
      if (
        Math.abs(move.clientX - origin.x) < DRAG_THRESHOLD &&
        Math.abs(move.clientY - origin.y) < DRAG_THRESHOLD
      ) {
        return
      }
      cleanup()
      onMoveStart(
        { clientX: origin.x, clientY: origin.y } as React.PointerEvent,
        held,
      )
      // Hand the in-flight gesture over: the real handler listens on window,
      // so replaying this move gets it tracking immediately.
      window.dispatchEvent(new PointerEvent('pointermove', move))
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', maybeStart)
      window.removeEventListener('pointerup', cleanup)
    }

    window.addEventListener('pointermove', maybeStart)
    window.addEventListener('pointerup', cleanup)
  }

  /** Selection: walk up from whatever was clicked to the nearest tagged node. */
  const onStageClick = (event: React.MouseEvent) => {
    if (!stage.current) return
    event.preventDefault()
    // Without this the click carries on to the artboard behind, whose job is
    // to clear the selection — so every click selected and instantly
    // deselected, and only the layer list appeared to work.
    event.stopPropagation()
    // The click that ends a drag should not re-select whatever it landed on.
    if (draggingNode) return
    setSelectedId(nodeFor(event.target)?.getAttribute(NODE_ATTR) ?? null)
  }

  /**
   * Where a node sits inside the artboard, in unscaled CSS pixels.
   *
   * The artboard is transformed, so screen rectangles have to be divided by
   * the zoom to land in the same coordinate space the overlay is drawn in.
   */
  const measure = useCallback(
    (id: string | null): Box | null => {
      const root = stage.current
      const wrap = artboard.current
      if (!root || !wrap || !id) return null
      const node = findNode(root, id)
      if (!node) return null

      const n = node.getBoundingClientRect()
      const w = wrap.getBoundingClientRect()
      return {
        left: (n.left - w.left) / zoom,
        top: (n.top - w.top) / zoom,
        width: n.width / zoom,
        height: n.height / zoom,
      }
    },
    [zoom],
  )

  useEffect(() => {
    setBox(measure(selectedId))

    const root = stage.current
    if (!root || !selectedId) return
    const node = findNode(root, selectedId)
    if (!node) return

    /**
     * The box has to follow the node, not just be taken once. A generated
     * design is still settling when it is first selected — images decode,
     * webfonts swap — and a box measured before that sits in the wrong place
     * with the wrong size for as long as the selection lasts.
     */
    const remeasure = () => setBox(measure(selectedId))
    const observer = new ResizeObserver(remeasure)
    observer.observe(node)
    observer.observe(root)

    // Images finish loading after layout has already been reported stable.
    const images = Array.from(root.querySelectorAll('img'))
    for (const image of images) image.addEventListener('load', remeasure)
    window.addEventListener('resize', remeasure)

    return () => {
      observer.disconnect()
      for (const image of images) image.removeEventListener('load', remeasure)
      window.removeEventListener('resize', remeasure)
    }
  }, [selectedId, measure, historyTick])

  useEffect(() => {
    setHoverBox(hoverId && hoverId !== selectedId ? measure(hoverId) : null)
  }, [hoverId, selectedId, measure])

  /** Same walk as the click, so what lights up is exactly what will select. */
  const onStageHover = (event: React.MouseEvent) =>
    setHoverId(nodeFor(event.target)?.getAttribute(NODE_ATTR) ?? null)

  // The selection ring used to be an inline `outline` on the node, which made
  // it part of innerHTML and shipped it to storage. It is an overlay now, so
  // there is nothing on the node to leak.

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
      if ((event.metaKey || event.ctrlKey) && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        setZoom((level) => clampZoom(level * 1.2))
      }
      if ((event.metaKey || event.ctrlKey) && event.key === '-') {
        event.preventDefault()
        setZoom((level) => clampZoom(level / 1.2))
      }
      if ((event.metaKey || event.ctrlKey) && event.key === '0') {
        event.preventDefault()
        setZoom(1)
      }
      if (event.shiftKey && (event.key === '2' || event.key === '@')) {
        event.preventDefault()
        zoomToSelection()
      }
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
  const back = `${canvasPathOf(workspace)}${projectId ? `?project=${projectId}` : ''}`

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
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#0B0B0C]">
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
          <HeaderButton
            label="Zoom out"
            onClick={() => setZoom((level) => clampZoom(level / 1.2))}
            disabled={zoom <= MIN_ZOOM}
          >
            <Minus className="size-4" />
          </HeaderButton>
          <button
            type="button"
            title="Reset to 100%"
            onClick={() => setZoom(1)}
            className="min-w-[46px] rounded-md px-1 py-1 text-center text-[11px] tabular-nums transition-colors hover:bg-white/[0.06]"
          >
            {Math.round(zoom * 100)}%
          </button>
          <HeaderButton
            label="Zoom in"
            onClick={() => setZoom((level) => clampZoom(level * 1.2))}
            disabled={zoom >= MAX_ZOOM}
          >
            <Plus className="size-4" />
          </HeaderButton>
          <HeaderButton
            label={selectedId ? 'Zoom to selection' : 'Fit the design'}
            onClick={zoomToSelection}
          >
            <Crosshair className="size-4" />
          </HeaderButton>

          <span className="mx-1 h-5 w-px bg-white/10" />

          {/* A link, not a button, so cmd-click opens the preview in its own
              tab — which is how anyone showing this to someone else will
              want it. */}
          <Link
            href={`${workspace}/preview?project=${projectId ?? ''}&design=${design.id}`}
            aria-label="Preview"
            title="Preview full screen"
            className="text-muted-foreground hover:text-foreground flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] transition-colors hover:bg-white/[0.06]"
          >
            <Play className="size-3.5" />
            Preview
          </Link>

          <ShareButton projectId={projectId} designId={design.id} />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Layers */}
        {/* Below md the layer list becomes a strip along the top: hiding it
            left no way to reach a node that was not visible on the artboard. */}
        {/* A nested tree needs to scroll vertically at any width, so under md
            this is a short scrolling panel rather than the horizontal strip
            the flat list used to be. */}
        <aside className="flex max-h-[26vh] w-full shrink-0 flex-col overflow-y-auto border-b border-white/[0.08] pt-2 md:max-h-none md:w-[210px] md:border-r md:border-b-0">
          <span className="px-3 pb-1 text-[10px] tracking-[0.14em] text-white/40 uppercase">
            Layers
          </span>
          <Layers
            rows={rows}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onHover={setHoverId}
            onToggle={onToggleLayer}
            onHide={onHideLayer}
            onLock={onLockLayer}
            onRename={onRenameLayer}
            onDrop={onDropLayer}
            allowInside={canDropInside}
          />
        </aside>

        {/* Artboard */}
        <main
          ref={attachViewport}
          className="min-w-0 flex-1 overflow-auto p-8"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
          onClick={() => setSelectedId(null)}
        >
          <div
            ref={artboard}
            className="relative mx-auto origin-top shadow-2xl"
            style={{ width: design.width, transform: `scale(${zoom})` }}
          >
            <div
              ref={stage}
              onPointerDown={onStagePointerDown}
              onClick={onStageClick}
              onDoubleClick={onStageDoubleClick}
              onContextMenu={onStageContextMenu}
              onMouseOver={onStageHover}
              onMouseLeave={() => setHoverId(null)}
              style={cssVars}
              className={cn(
                // Dragging an element otherwise paints a text selection right
                // across the design. Selection is re-enabled on the node that
                // is actually open for typing.
                'select-none [&_*]:cursor-pointer [&_[contenteditable=true]]:select-text',
                draggingNode && '[&_*]:cursor-grabbing',
              )}
            />

            {hoverBox && !resizing && (
              <div
                aria-hidden
                className="pointer-events-none absolute border border-sky-400/50"
                style={{ ...hoverBox, borderWidth: 1 / zoom }}
              />
            )}

            {dropLine && (
              <div
                aria-hidden
                className="pointer-events-none absolute bg-fuchsia-400"
                style={{
                  left: dropLine.left,
                  top: dropLine.top,
                  width: dropLine.width,
                  height: dropLine.height,
                }}
              />
            )}

            {box && (
              <div
                aria-hidden
                className="pointer-events-none absolute border border-sky-400"
                style={{ ...box, borderWidth: 1.5 / zoom }}
              >

                {/* Handles counter-scale so they stay the same size on screen
                    however far in or out the artboard is zoomed. A locked node
                    still shows its box — it is selected, after all — but
                    nothing on it that would resize it. */}
                {!selectionLocked && (
                  <>
                    <Handle edge="e" zoom={zoom} onPointerDown={onResizeStart('e')} />
                    <Handle edge="s" zoom={zoom} onPointerDown={onResizeStart('s')} />
                    <Handle edge="se" zoom={zoom} onPointerDown={onResizeStart('se')} />
                  </>
                )}

                {/* Only while dragging. A permanent badge sits on top of any
                    element smaller than the badge itself. */}
                {resizing && (
                  <span
                    className="absolute top-full left-0 mt-1 rounded bg-sky-500 px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-white"
                    style={{
                      // The whole badge is counter-scaled rather than just its
                      // font: scaling the text but not the padding is what made
                      // it wrap to three lines at small sizes.
                      transform: `scale(${1 / zoom})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    {Math.round(box.width)} × {Math.round(box.height)}
                  </span>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Properties */}
        {/* A bottom sheet under md, the way the canvas inspectors already are
            — 264px anchored right is 68% of a 390px screen. */}
        <aside className="absolute inset-x-0 bottom-0 z-30 max-h-[46vh] overflow-y-auto border-t border-white/[0.08] bg-[#0B0B0C] md:static md:inset-auto md:max-h-none md:w-[264px] md:shrink-0 md:border-t-0 md:border-l">
          <div className="border-b border-white/[0.08] p-3">
            <h3 className="mb-2 text-[10px] tracking-[0.14em] text-white/40 uppercase">
              Insert
            </h3>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  ['image', ImageIcon, 'Image'],
                  ['heading', Heading, 'Heading'],
                  ['text', TypeIcon, 'Text'],
                  ['button', RectangleHorizontal, 'Button'],
                  ['box', Square, 'Box'],
                  ['divider', SeparatorHorizontal, 'Divider'],
                ] as const
              ).map(([kind, Icon, name]) => (
                <button
                  key={kind}
                  type="button"
                  title={`Insert ${name.toLowerCase()}${selected ? ' after the selection' : ''}`}
                  onClick={() => onInsert(kind)}
                  className="text-muted-foreground hover:text-foreground flex flex-col items-center gap-1 rounded-md bg-white/[0.04] py-2 text-[10px] transition-colors hover:bg-white/[0.1]"
                >
                  <Icon className="size-3.5" />
                  {name}
                </button>
              ))}
            </div>

            {/*
              A design's own components are things to place, exactly like a
              heading or a button — so they belong in the same panel rather
              than in a library somewhere else. Placing one copies it; the
              copy is an instance because it carries the same name.
            */}
            {components.length > 0 && (
              <div className="mt-3">
                <h3 className="mb-2 text-[10px] tracking-[0.14em] text-white/40 uppercase">
                  Components
                </h3>
                <div className="flex flex-wrap gap-1">
                  {components.map((entry) => (
                    <button
                      key={entry.name}
                      type="button"
                      title={`Place another ${entry.name}${selected ? ' after the selection' : ''}`}
                      onClick={() => onInsertComponent(entry.name)}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1.5 text-[10px] transition-colors hover:bg-white/[0.1]"
                    >
                      <Component className="size-3" />
                      {entry.name}
                      <span className="text-white/30">{entry.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                locked={selectionLocked}
                onStyle={onStyle}
                onStyles={onStyles}
                onText={onText}
                onAttribute={onAttribute}
                onUpload={(file) => void onUpload(file)}
                onReplace={onReplace}
                onExport={onExport}
                onUnlock={() => selectedId && onLockLayer(selectedId, false)}
                component={componentRoot ? componentName(componentRoot) : null}
                componentIsSelection={componentRoot !== null && componentRoot === selected}
                instances={
                  componentRoot
                    ? (components.find((entry) => entry.name === componentName(componentRoot))
                        ?.count ?? 1)
                    : 0
                }
                onCreateComponent={onCreateComponent}
                onRenameComponent={onRenameComponent}
                onDetachComponent={onDetachComponent}
                onPushToInstances={onPushToInstances}
                onSelectComponentRoot={() =>
                  componentRoot && setSelectedId(componentRoot.getAttribute(NODE_ATTR))
                }
                uploading={uploading}
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

      {/*
        The AI sits along the bottom rather than at the foot of the property
        panel. It is about the page, not about the property being edited: with
        `/section` it can aim anywhere without a selection first, so burying it
        under Effects made the one control that does not need the sidebar the
        hardest one to reach. Full width also gives the section list somewhere
        to open.
      */}
      {/*
        A dock, not a bar. It floats over the artboard in the middle of the
        bottom edge rather than spanning the width, so it takes the room it
        needs and gives the rest back to the design — a full-width strip cost
        vertical space on every screen for a control used a few times an hour.
        Pointer events are off on the spacer so the canvas underneath stays
        reachable either side of it.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
        {aiOpen ? (
          <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#141416]/95 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between px-3 pt-2.5">
              <span className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-white/40 uppercase">
                <Sparkles className="size-3" />
                Ask AI
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setAiOpen(false)}
                className="text-muted-foreground hover:text-foreground grid size-6 place-items-center rounded-md transition-colors hover:bg-white/[0.08]"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <AiPanel
              label={selected ? labelFor(selected) : 'whole page'}
              busy={asking}
              onAsk={(instruction) => void onAsk(instruction)}
              sections={sections}
              onTarget={setSelectedId}
            />
          </div>
        ) : (
          /* Closed, it is a single button — the design gets the space back, and
             the way in is still where the dock was. */
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-[#141416]/95 px-4 py-2.5 text-xs text-white/70 shadow-2xl backdrop-blur transition-colors hover:text-white"
          >
            <Sparkles className="size-3.5" />
            Ask AI
          </button>
        )}
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
            <MenuItem onClick={() => { setMenu(null); zoomToSelection() }}>
              <Crosshair className="size-3.5" />
              Zoom to this
            </MenuItem>
            <MenuItem onClick={() => { setMenu(null); onDuplicate() }}>
              <Copy className="size-3.5" />
              Duplicate
            </MenuItem>
            {!componentRoot && (
              <MenuItem onClick={() => { setMenu(null); onCreateComponent() }}>
                <Component className="size-3.5" />
                Create component
              </MenuItem>
            )}
            {componentRoot && (
              <MenuItem onClick={() => { setMenu(null); onPushToInstances() }}>
                <Component className="size-3.5" />
                Push to all instances
              </MenuItem>
            )}
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

type Box = { left: number; top: number; width: number; height: number }

const HANDLE_STYLES: Record<'e' | 's' | 'se', React.CSSProperties> = {
  e: { right: 0, top: '50%', cursor: 'ew-resize' },
  s: { bottom: 0, left: '50%', cursor: 'ns-resize' },
  se: { right: 0, bottom: 0, cursor: 'nwse-resize' },
}

const Handle = ({
  edge,
  zoom,
  onPointerDown,
}: {
  edge: 'e' | 's' | 'se'
  zoom: number
  onPointerDown: (event: React.PointerEvent) => void
}) => {
  const size = 9 / zoom
  const style = HANDLE_STYLES[edge]
  return (
    <span
      onPointerDown={onPointerDown}
      // The click that follows a drag still bubbles to the artboard, whose
      // job is to clear the selection — so a resize ended by deselecting the
      // thing that had just been resized.
      onClick={(event) => event.stopPropagation()}
      className="pointer-events-auto absolute rounded-[2px] border border-white bg-sky-500"
      style={{
        ...style,
        width: size,
        height: size,
        marginRight: -size / 2,
        marginBottom: -size / 2,
        ...(edge === 'e' ? { marginTop: -size / 2 } : {}),
        ...(edge === 's' ? { marginLeft: -size / 2 } : {}),
      }}
    />
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
