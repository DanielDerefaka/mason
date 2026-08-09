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

  const deleteProject = async (projectId: Id<'projects'>) => {
    try {
      await deleteProjectMutation({ projectId })
      dispatch(removeProject(projectId))
      toast.success('Project deleted')
    } catch {
      toast.error('Could not delete that project.')
    }
  }

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
    renameProject,
  }
}
