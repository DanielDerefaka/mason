'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import {
  fetchProjectsFailure,
  fetchProjectsStart,
  fetchProjectsSuccess,
  removeProject,
} from '@/redux/slice/projects'
import type { ProjectsState } from '@/redux/slice/projects'

export const useProjects = () => {
  const dispatch = useAppDispatch()
  const projectState = useAppSelector((state) => state.projects as ProjectsState)

  // Convex pushes updates, so this mirrors the live query into Redux rather
  // than fetching once.
  const data = useQuery(api.project.getProjects)
  const createProjectMutation = useMutation(api.project.createProject)
  const deleteProjectMutation = useMutation(api.project.deleteProject)
  const setThumbnail = useMutation(api.project.setProjectThumbnail)
  const renameProjectMutation = useMutation(api.project.renameProject)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (data === undefined) {
      dispatch(fetchProjectsStart())
      return
    }
    dispatch(fetchProjectsSuccess({ projects: data.projects, total: data.total }))
  }, [data, dispatch])

  const createProject = async () => {
    setCreating(true)
    try {
      const projectId = await createProjectMutation({})
      toast.success('Project created')
      return projectId
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create the project.'
      dispatch(fetchProjectsFailure(message))
      toast.error(message)
      return null
    } finally {
      setCreating(false)
    }
  }

  /**
   * Archiving, which is what deleting means now.
   *
   * Takes a list because the projects page can select several, and one
   * round trip is both faster and atomic from the caller's point of view.
   */
  const archiveProjects = async (projectIds: Id<'projects'>[]) => {
    if (projectIds.length === 0) return
    try {
      await deleteProjectMutation({ projectIds })
      for (const id of projectIds) dispatch(removeProject(id))
      toast.success(
        projectIds.length === 1 ? 'Moved to archive' : `${projectIds.length} moved to archive`,
        { description: 'Restore it from the archive at any time.' },
      )
    } catch {
      toast.error('Could not archive that project.')
    }
  }

  /** Kept for callers that still archive exactly one. */
  const deleteProject = (projectId: Id<'projects'>) => archiveProjects([projectId])

  const renameProject = async (projectId: Id<'projects'>, name: string) => {
    try {
      await renameProjectMutation({ projectId, name })
    } catch {
      toast.error('Could not rename that project.')
    }
  }

  return {
    projects: projectState.projects,
    projectsTotal: projectState.projectsTotal,
    loading: projectState.loading,
    error: projectState.error,
    creating,
    createProject,
    deleteProject,
    archiveProjects,
    renameProject,
    setThumbnail,
  }
}
