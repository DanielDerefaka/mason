'use client'

import { useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore, type AppStore } from './store'

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  // One store per client, created lazily. Creating it at module scope would
  // share state across requests during SSR.
  const storeRef = useRef<AppStore | null>(null)
  if (storeRef.current === null) storeRef.current = makeStore()

  return <Provider store={storeRef.current}>{children}</Provider>
}
