'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects } from '@/hooks/use-projects'

export const Projects = () => {
  const { projects, projectsTotal, loading, creating, createProject, deleteProject } = useProjects()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            {projectsTotal} {projectsTotal === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <Button onClick={() => void createProject()} disabled={creating}>
          {creating ? 'Creating…' : 'Create project'}
        </Button>
      </div>

      {loading && projects.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="text-muted-foreground text-sm">
            Create your first project to start sketching.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project._id} className="flex flex-col justify-between gap-4 p-5">
              <div>
                <p className="font-medium">{project.name}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(project.lastModified).toLocaleString()}
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void deleteProject(project._id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default Projects
