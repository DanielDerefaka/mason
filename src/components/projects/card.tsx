'use client'

import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { useProjects } from '@/hooks/use-projects'
import type { Doc } from '../../../convex/_generated/dataModel'

export const ProjectCard = ({
  project,
  session,
}: {
  project: Doc<'projects'>
  session: string
}) => {
  const { renameProject } = useProjects()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.name)
  const input = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!editing) setDraft(project.name)
  }, [project.name, editing])

  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== project.name) void renameProject(project._id, next)
    else setDraft(project.name)
  }

  return (
    <div className="group block">
      <Link
        href={`/dashboard/${session}/canvas?project=${project._id}`}
        className="block"
        aria-label={`Open ${project.name}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-[1.01]">
          <Image
            src="/images/project-cover.webp"
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            className="object-cover"
          />
        </div>
      </Link>

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
