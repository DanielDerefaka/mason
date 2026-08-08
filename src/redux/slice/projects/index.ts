import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'

export type ProjectsState = {
  projects: Doc<'projects'>[]
  projectsTotal: number
  loading: boolean
  error: string | null
}

const initialState: ProjectsState = {
  projects: [],
  projectsTotal: 0,
  loading: false,
  error: null,
}

export const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    fetchProjectsStart: (state) => {
      state.loading = true
      state.error = null
    },
    fetchProjectsSuccess: (
      state,
      action: PayloadAction<{ projects: Doc<'projects'>[]; total: number }>,
    ) => {
      state.projects = action.payload.projects
      state.projectsTotal = action.payload.total
      state.loading = false
    },
    fetchProjectsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    },
    removeProject: (state, action: PayloadAction<Id<'projects'>>) => {
      const index = state.projects.findIndex((p) => p._id === action.payload)
      if (index !== -1) {
        state.projects.splice(index, 1)
        state.projectsTotal = state.projects.length
      }
    },
    clearProjects: (state) => {
      state.projects = []
      state.projectsTotal = 0
    },
  },
})

export const {
  fetchProjectsStart,
  fetchProjectsSuccess,
  fetchProjectsFailure,
  removeProject,
  clearProjects,
} = projectsSlice.actions

export default projectsSlice.reducer
