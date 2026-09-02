'use client'

import { useQuery } from 'convex/react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useProjects } from '@/hooks/use-projects'
import { api } from '../../../convex/_generated/api'
import { ProjectArchive } from './archive'
import { ProjectCard } from './card'

export const ProjectsList = () => {
  const params = useParams<{ session: string }>()
  const { projects, archiveProjects, createProject, creating } = useProjects()
  // The query the navbar's badge reads, so the first-run note and the corner
  // of the screen cannot disagree about how many generations are left.
  const credits = useQuery(api.credits.getBalance)
  const [view, setView] = useState<'live' | 'archive'>('live')
  /** True while a card is hovering the Archive tab, so the target can say so. */
  const [dropping, setDropping] = useState(false)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Your projects</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">Pick up where you left off.</p>
      </div>

      {/* A tab rather than a separate page: the archive is the same list in
          another state, and a route of its own would make it feel like
          somewhere projects go to be forgotten. */}
      <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 w-max">
        {(['live', 'archive'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            aria-pressed={view === option}
            /* The Archive tab is also a drop target. Dragging a project onto
               it is the gesture the shape of the thing already suggests —
               a tab that holds projects should accept one. */
            onDragOver={
              option === 'archive'
                ? (event) => {
                    if (!event.dataTransfer.types.includes('text/mason-project')) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setDropping(true)
                  }
                : undefined
            }
            onDragLeave={option === 'archive' ? () => setDropping(false) : undefined}
            onDrop={
              option === 'archive'
                ? (event) => {
                    event.preventDefault()
                    setDropping(false)
                    const id = event.dataTransfer.getData('text/mason-project')
                    if (id) void archiveProjects([id as Parameters<typeof archiveProjects>[0][number]])
                  }
                : undefined
            }
            className={cn(
              'rounded-full px-4 py-1.5 text-xs capitalize transition-all',
              view === option ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
              // Grows and lights up while something is over it, so the drop
              // reads as landing somewhere rather than being let go of.
              option === 'archive' && dropping && 'scale-110 bg-sky-500/25 text-foreground ring-1 ring-sky-400/60',
            )}
          >
            {option === 'live' ? 'Projects' : 'Archive'}
          </button>
        ))}
      </div>

      {view === 'archive' ? (
        <ProjectArchive />
      ) : projects.length === 0 ? (
        /* The first run. Someone who has just made an account landed on a
           heading, a tab bar and a line saying there was nothing here, with
           the one button that makes something up in the navbar. This says
           what the product does and what they have to spend, and puts both
           ways to start where they are already looking. The count waits for
           the query rather than showing a placeholder: a sentence with a
           dash in it reads as broken. */
        <div className="max-w-[560px] rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <p className="text-sm leading-relaxed">
            Nothing here yet. Start a sketch and Mason builds the screen beside it.
            {credits == null
              ? ''
              : ` You have ${credits} credit${credits === 1 ? '' : 's'}, and one credit is one generation.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              size="sm"
              className="rounded-full px-4"
              onClick={() => void createProject()}
              disabled={creating}
            >
              <Plus className="size-4" />
              {creating ? 'Creating…' : 'New project'}
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full px-4">
              <Link href="/try">Open the canvas</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} session={params.session} />
          ))}
        </div>
      )}
    </div>
  )
}
