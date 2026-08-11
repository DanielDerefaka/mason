'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { useProjects } from '@/hooks/use-projects'
import { ProjectArchive } from './archive'
import { ProjectCard } from './card'

export const ProjectsList = () => {
  const params = useParams<{ session: string }>()
  const { projects } = useProjects()
  const [view, setView] = useState<'live' | 'archive'>('live')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Your Projects</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Manage your design projects and continue where you left off.
        </p>
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
            className={cn(
              'rounded-full px-4 py-1.5 text-xs capitalize transition-colors',
              view === option ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option === 'live' ? 'Projects' : 'Archive'}
          </button>
        ))}
      </div>

      {view === 'archive' ? (
        <ProjectArchive />
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No projects yet. Create one to get started.
        </p>
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
