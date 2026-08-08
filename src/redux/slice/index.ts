import type { Reducer } from '@reduxjs/toolkit'
import profileReducer from './profile'
import projectsReducer from './projects'
import shapesReducer from './shapes'

/** Every slice reducer that belongs in the root store, keyed by its mount point. */
export const slice: Record<string, Reducer> = {
  profile: profileReducer,
  projects: projectsReducer,
  shapes: shapesReducer,
}
