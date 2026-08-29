'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type GuestContextValue = {
  /** True for an anonymous /try session. */
  isGuest: boolean
  /**
   * Asks for whatever a download costs, and resolves true once it is paid.
   *
   * That is an email address, once, and never an account: the trial says no
   * account is needed and must not then demand one at the only moment the
   * work is worth something. Resolves true the moment there is nothing left
   * to ask — which is every export after the first — and false when the
   * visitor closed the dialog instead.
   *
   * Called by every download a guest can reach: the design and the build
   * brief. The Next.js project is not one of them; it is not offered on /try.
   */
  requireExport: () => Promise<boolean>
}

/**
 * The default is what the dashboard gets, because it never mounts a provider:
 * not a guest, and every gate opens. That is what makes the export gate safe
 * to wire into components the dashboard and /try share — outside /try the
 * check is a resolved promise and the behaviour is exactly what it was.
 */
const DEFAULT_GUEST: GuestContextValue = {
  isGuest: false,
  requireExport: async () => true,
}

const GuestContext = createContext<GuestContextValue>(DEFAULT_GUEST)

/**
 * Accepts the value whole or as two props, so the shell can pass whichever
 * it has to hand. Anything not given falls back to the dashboard default.
 */
export const GuestProvider = ({
  value,
  isGuest,
  requireExport,
  children,
}: {
  value?: Partial<GuestContextValue>
  isGuest?: boolean
  requireExport?: GuestContextValue['requireExport']
  children: ReactNode
}) => {
  const resolvedIsGuest = isGuest ?? value?.isGuest ?? DEFAULT_GUEST.isGuest
  const resolvedRequire = requireExport ?? value?.requireExport ?? DEFAULT_GUEST.requireExport
  const merged = useMemo<GuestContextValue>(
    () => ({ isGuest: resolvedIsGuest, requireExport: resolvedRequire }),
    [resolvedIsGuest, resolvedRequire],
  )
  return <GuestContext.Provider value={merged}>{children}</GuestContext.Provider>
}

export const useGuest = (): GuestContextValue => useContext(GuestContext)
