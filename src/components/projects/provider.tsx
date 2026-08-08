'use client'

import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/redux/hooks'
import { fetchProjectsSuccess } from '@/redux/slice/projects'
import type { Doc } from '../../../convex/_generated/dataModel'

/**
 * Seeds the store with the server-rendered projects so the grid paints on the
 * first frame instead of flashing an empty state while the client query runs.
 */
export const ProjectsProvider = ({
  initialProjects,
  children,
}: {
  initialProjects: Doc<'projects'>[]
  children: React.ReactNode
}) => {
  const dispatch = useAppDispatch()
  const seeded = useRef(false)

  if (!seeded.current) {
    seeded.current = true
    dispatch(
      fetchProjectsSuccess({ projects: initialProjects, total: initialProjects.length }),
    )
  }

  useEffect(() => {
    dispatch(
      fetchProjectsSuccess({ projects: initialProjects, total: initialProjects.length }),
    )
  }, [initialProjects, dispatch])

  return <>{children}</>
}
