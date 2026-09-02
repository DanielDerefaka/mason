'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { toast } from 'sonner'

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
  /**
   * True while the free week is on and accounts are not on offer.
   *
   * Read by the exits from /try — the cap screen, the out-of-credits sheet,
   * "Keep this canvas" — which offer an account outside the week and, during
   * it, either say "accounts open soon" or are not rendered at all: both auth
   * screens redirect to /try while the flag is on, so an offer of one is an
   * offer to go nowhere. It changes nothing about what a download costs. A
   * prop from the server page rather than a read of the environment, because
   * the switch is server-side.
   */
  freeWeek: boolean
  /**
   * Asks for an address so the visitor can be told when accounts open, and
   * resolves true once one is on the list. The same gate as a download,
   * opened for a different reason — and answered at once for a guest who has
   * already given one, since the list has them.
   */
  requestNotice: () => Promise<boolean>
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
  freeWeek: false,
  requestNotice: async () => true,
}

const GuestContext = createContext<GuestContextValue>(DEFAULT_GUEST)

/**
 * Accepts the value whole or as separate props, so the shell can pass
 * whichever it has to hand. Anything not given falls back to the dashboard
 * default.
 */
export const GuestProvider = ({
  value,
  isGuest,
  requireExport,
  freeWeek,
  requestNotice,
  children,
}: {
  value?: Partial<GuestContextValue>
  isGuest?: boolean
  requireExport?: GuestContextValue['requireExport']
  freeWeek?: boolean
  requestNotice?: GuestContextValue['requestNotice']
  children: ReactNode
}) => {
  const resolvedIsGuest = isGuest ?? value?.isGuest ?? DEFAULT_GUEST.isGuest
  const resolvedRequire = requireExport ?? value?.requireExport ?? DEFAULT_GUEST.requireExport
  const resolvedFreeWeek = freeWeek ?? value?.freeWeek ?? DEFAULT_GUEST.freeWeek
  const resolvedNotice = requestNotice ?? value?.requestNotice ?? DEFAULT_GUEST.requestNotice
  const merged = useMemo<GuestContextValue>(
    () => ({
      isGuest: resolvedIsGuest,
      requireExport: resolvedRequire,
      freeWeek: resolvedFreeWeek,
      requestNotice: resolvedNotice,
    }),
    [resolvedIsGuest, resolvedRequire, resolvedFreeWeek, resolvedNotice],
  )
  return <GuestContext.Provider value={merged}>{children}</GuestContext.Provider>
}

export const useGuest = (): GuestContextValue => useContext(GuestContext)

/**
 * The "tell me when" action, for the two places that offer it during the
 * week. Both say the same thing once the address is down, so the sentence
 * lives here rather than twice; a guest already on the list hears it too,
 * because it is just as true for them.
 */
export const useAccountNotice = () => {
  const { requestNotice } = useGuest()
  return useCallback(() => {
    void requestNotice().then((ok) => {
      if (ok) toast.success('We will email you when accounts open')
    })
  }, [requestNotice])
}
