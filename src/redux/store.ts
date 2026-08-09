import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { APIS, apiReducers } from './api'
import { slice } from './slice'

const rootReducer = combineReducers({ ...slice, ...apiReducers })

export type RootState = ReturnType<typeof rootReducer>

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDM) => getDM().concat(...APIS),
  })
}

export const store = makeStore()

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
