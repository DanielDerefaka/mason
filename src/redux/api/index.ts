import type { Middleware, Reducer } from '@reduxjs/toolkit'
import { styleGuideApi } from './style-guide'

/**
 * RTK Query API middleware. The store concats whatever is here onto the default
 * middleware; each API slice also has to mount its own reducer, below.
 */
export const APIS: Middleware[] = [styleGuideApi.middleware]

/** Reducers for the API slices, keyed by their `reducerPath`. */
export const apiReducers: Record<string, Reducer> = {
  [styleGuideApi.reducerPath]: styleGuideApi.reducer,
}
