'use client'

import { useParams } from 'next/navigation'
import { useProjects } from '@/hooks/use-projects'
import { ProjectCard } from './card'

export const ProjectsList = () => {
  const params = useParams<{ session: string }>()
  const { projects } = useProjects()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Your Projects</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Manage your design projects and continue where you left off.
        </p>
      </div>

      {projects.length === 0 ? (
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
