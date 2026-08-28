'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type GuestContextValue = {
  /** True for an anonymous /try session. */
  isGuest: boolean
  /**
   * Asks for an account before something that needs one — the Next.js export.
   * Resolves true when the visitor already has one or just made one, false
   * when they closed the dialog instead.
   */
  requireAccount: () => Promise<boolean>
}

/**
 * The default is what the dashboard gets, because it never mounts a provider:
 * not a guest, and every gate opens. That is what makes the export gate safe
 * to wire into components the dashboard and /try share — outside /try the
 * check is a resolved promise and the behaviour is exactly what it was.
 */
const DEFAULT_GUEST: GuestContextValue = {
  isGuest: false,
  requireAccount: async () => true,
}

const GuestContext = createContext<GuestContextValue>(DEFAULT_GUEST)

/**
 * Accepts the value whole or as two props, so the shell can pass whichever
 * it has to hand. Anything not given falls back to the dashboard default.
 */
export const GuestProvider = ({
  value,
  isGuest,
  requireAccount,
  children,
}: {
  value?: Partial<GuestContextValue>
  isGuest?: boolean
  requireAccount?: GuestContextValue['requireAccount']
  children: ReactNode
}) => {
  const resolvedIsGuest = isGuest ?? value?.isGuest ?? DEFAULT_GUEST.isGuest
  const resolvedRequire = requireAccount ?? value?.requireAccount ?? DEFAULT_GUEST.requireAccount
  const merged = useMemo<GuestContextValue>(
    () => ({ isGuest: resolvedIsGuest, requireAccount: resolvedRequire }),
    [resolvedIsGuest, resolvedRequire],
  )
  return <GuestContext.Provider value={merged}>{children}</GuestContext.Provider>
}

export const useGuest = (): GuestContextValue => useContext(GuestContext)
