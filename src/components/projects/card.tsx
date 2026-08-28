'use client'

import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { DESIGN_SCOPE, designScope, sanitiseHtml } from '@/lib/sanitise'
import { useProjects } from '@/hooks/use-projects'
import type { Doc } from '../../../convex/_generated/dataModel'

export const ProjectCard = ({
  project,
  session,
}: {
  project: Doc<'projects'>
  session: string
}) => {
  const { renameProject, setThumbnail, archiveProjects } = useProjects()
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.name)
  const input = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!editing) setDraft(project.name)
  }, [project.name, editing])

  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  /**
   * The project's picture: the design it was last opened on, rendered small.
   *
   * The markup is already here — the card is handed the whole project — so the
   * card draws the real design rather than a screenshot of it. Nothing is
   * uploaded, nothing is stored twice, and editing a design updates its own
   * thumbnail for free. A project with no design, or one whose picture has
   * been set back to the default, keeps the cover image.
   */
  const stored = (project.sketchesData ?? {}) as { shapes?: Array<{ id: string; html?: string }> }
  const design = project.thumbnailDesignId
    ? stored.shapes?.find((shape) => shape.id === project.thumbnailDesignId)
    : undefined
  // Scoped to this card alone: the grid shows many projects, and a design
  // styled under the shared class restyles every thumbnail beside it.
  const scope = designScope(project._id)
  const preview = design?.html?.trim() ? sanitiseHtml(design.html, scope) : null

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== project.name) void renameProject(project._id, next)
    else setDraft(project.name)
  }

  return (
    <div
      className="group relative block"
      // Dragging a card onto the Archive tab archives it. The payload is the
      // id; the tab does the work.
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/mason-project', project._id)
        event.dataTransfer.effectAllowed = 'move'
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        setMenu({ x: event.clientX, y: event.clientY })
      }}
    >
      <Link
        href={`/dashboard/${session}/canvas?project=${project._id}`}
        className="block"
        aria-label={`Open ${project.name}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white transition-transform duration-300 group-hover:scale-[1.01]">
          {preview ? (
            /* Drawn at a real page width and scaled down, so the card shows the
               design's actual proportions rather than a squeezed version of
               them. Pointer events are off: this is a picture of a design, and
               a card is a link. */
            <div
              aria-hidden
              className={`${DESIGN_SCOPE} ${scope} pointer-events-none absolute top-0 left-0 origin-top-left`}
              style={{ width: 1280, transform: 'scale(0.25)' }}
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          ) : (
            <Image
              src="/images/project-cover.webp"
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
              className="object-cover"
            />
          )}
        </div>
      </Link>

      {preview && (
        /* Outside the link on purpose: nested inside it, every click would
           open the project instead of resetting the picture. */
        <button
          type="button"
          onClick={() => void setThumbnail({ projectId: project._id, designId: null, pinned: true })}
          title="Use the default cover"
          className="absolute top-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-[10px] text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          Reset image
        </button>
      )}

      {menu && (
        <>
          {/* A full-screen catcher rather than a blur handler: a click anywhere,
              including on another card, should close this first. */}
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null) }} />
          <div
            className="fixed z-50 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#141416] py-1 shadow-2xl"
            style={{ left: menu.x, top: menu.y }}
          >
            <button
              type="button"
              onClick={() => {
                setMenu(null)
                setEditing(true)
              }}
              className="block w-full px-3 py-2 text-left text-xs text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(null)
                void archiveProjects([project._id])
              }}
              className="block w-full px-3 py-2 text-left text-xs text-red-400 transition-colors hover:bg-red-500/10"
            >
              Move to archive
            </button>
          </div>
        </>
      )}

      {editing ? (
        <input
          ref={input}
          value={draft}
          autoFocus
          maxLength={80}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              setDraft(project.name)
              setEditing(false)
            }
          }}
          className="mt-3 w-full rounded-md border border-white/15 bg-white/[0.06] px-2 py-1 text-sm font-medium outline-none focus:border-white/35"
        />
      ) : (
        /* A button, not the Link: double-clicking a link to rename it would
           also follow it. The card image stays the way into the project. */
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          title="Double-click to rename"
          className="mt-3 block w-full truncate rounded-md px-2 py-1 text-left text-sm font-medium transition-colors hover:bg-white/[0.06]"
        >
          {project.name}
        </button>
      )}

      <p className="text-muted-foreground mt-0.5 px-2 text-xs">
        {formatDistanceToNow(new Date(project.lastModified), { addSuffix: true })}
      </p>
    </div>
  )
}
