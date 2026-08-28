'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvex, useMutation, useQuery, type ConvexReactClient } from 'convex/react'
import { Loader2, Lock, Mail } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Field } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

type Mode = 'signUp' | 'signIn'

// The backend refusing outright, as opposed to refusing these credentials.
// "Server Error" is deliberately not here: in production Convex redacts a
// wrong password to exactly that, and it must not read as an outage.
const BACKEND_DOWN = /exceeded the free plan|deployments have been disabled|failed to fetch|network/i

/**
 * `signIn` resolves when tokens are issued, but the websocket re-authenticates
 * a moment later. Redeeming the claim before then would run as the guest,
 * and redeeming your own project is a no-op — so wait until the client
 * answers as someone who is not the anonymous user it started as.
 */
const waitForIdentity = async (convex: ConvexReactClient, guestId: string | null) => {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      const user = await convex.query(api.user.getCurrentUser, {})
      if (user && (user._id !== guestId || !user.isAnonymous)) return user
    } catch {
      // Between tokens the query can be refused; that is the thing being waited out.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return null
}

/**
 * Opened by `requireAccount` before an export. A sign-up converts the
 * anonymous user in place, so the project is already theirs; a sign-in to an
 * existing account is a different user, so a claim is issued first and
 * redeemed after to move the canvas across. The claim is issued for both
 * flows because sign-up can also land on a different user when the provider
 * declines to convert — a claim nobody redeems just expires.
 */
export const KeepYourWorkDialog = ({
  open,
  onDone,
}: {
  open: boolean
  onDone: (ok: boolean) => void
}) => {
  const { signIn } = useAuthActions()
  const convex = useConvex()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = useQuery(api.user.getCurrentUser, open ? {} : 'skip')
  const issueClaim = useMutation(api.guest.issueClaim)
  const redeemClaim = useMutation(api.guest.redeemClaim)

  const [mode, setMode] = useState<Mode>('signUp')
  /**
   * Seeded from `?email=`, which is where the marketing footer puts it.
   *
   * That form is a plain GET, and during the free week it aims at /try
   * instead of /auth/sign-up — so an address typed into it used to be
   * carried all the way here and then thrown away, leaving the visitor to
   * type it a second time at the one moment they are being asked to commit.
   * The sign-up page has always prefilled from the same parameter; this is
   * that behaviour following the redirect.
   */
  const [email, setEmail] = useState(() => {
    const arriving = searchParams.get('email')?.trim() ?? ''
    return arriving.includes('@') ? arriving : ''
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /**
   * Both of these outlive an attempt, and that is the point.
   *
   * A refused sign-in does not just fail — the Next.js auth proxy clears the
   * auth cookies on its way out, so the guest session is gone and with it the
   * `getCurrentUser` answer and the right to mint a claim. Held here, the
   * claim issued before the first attempt is still redeemable on the second
   * (it lives fifteen minutes), so a mistyped password costs a retry rather
   * than the canvas.
   */
  const claimRef = useRef<string | null>(null)
  const guestIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (current?._id) guestIdRef.current = current._id
  }, [current?._id])

  const projectId = searchParams.get('project') as Id<'projects'> | null

  const submit = async () => {
    const address = email.trim()
    if (!address) {
      setError('Enter your email')
      return
    }
    if (password.length < 8) {
      setError('Use at least 8 characters')
      return
    }
    setBusy(true)
    setError(null)

    /**
     * Asked, not discovered by failing. In production Convex redacts the
     * message of a thrown error to "Server Error", so the old test for
     * /already exists/ matched in development and never once live — and the
     * failed attempt it was reading had already cost the guest their cookies.
     */
    const taken = await convex
      .query(api.auth.hasPasswordAccount, { email: address })
      .catch(() => null)
    if (taken === true && mode === 'signUp') {
      setBusy(false)
      setMode('signIn')
      setError('That email already has an account — sign in to keep your work with it.')
      return
    }
    if (taken === false && mode === 'signIn') {
      setBusy(false)
      setMode('signUp')
      setError('No account with that email yet — create one and this canvas comes with you.')
      return
    }

    const guestId = guestIdRef.current
    if (projectId && !claimRef.current) {
      try {
        claimRef.current = (await issueClaim({ projectId })).token
      } catch {
        claimRef.current = null
      }
    }
    const claim = claimRef.current

    try {
      await signIn(
        'password',
        mode === 'signUp'
          ? { email: address, password, flow: 'signUp', username: address.split('@')[0] }
          : { email: address, password, flow: 'signIn' },
      )
    } catch (caught) {
      setBusy(false)
      const message = caught instanceof Error ? caught.message : ''
      if (mode === 'signUp' && /already exists/i.test(message)) {
        setMode('signIn')
        setError('That email already has an account — sign in to keep your work with it.')
        return
      }
      if (BACKEND_DOWN.test(message)) {
        setError('Signing in is unavailable right now — the backend refused the request, not your details.')
        return
      }
      setError(
        mode === 'signUp'
          ? 'Could not create that account. If you already have one with this email, sign in instead.'
          : 'Those credentials did not match an account.',
      )
      return
    }

    const user = await waitForIdentity(convex, guestId)
    const moved = user !== null && guestId !== null && user._id !== guestId
    // Redeemed whenever there is a claim, not only when the user id moved: a
    // sign-up converts the guest in place and the claim is then a no-op, and
    // after a failed first attempt there may be no guest id left to compare
    // against even though the work still has to follow.
    if (claim) {
      claimRef.current = null
      try {
        await redeemClaim({ token: claim })
      } catch {
        if (moved) {
          toast.error(
            'Signed in, but this sketch could not follow you — it is still on the guest session',
          )
        }
      }
    }
    if (moved) router.replace(`${pathname}?${searchParams.toString()}`)
    toast.success(mode === 'signUp' ? 'Account created — your work is saved' : 'Signed in — your work is saved')
    setBusy(false)
    setPassword('')
    onDone(true)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onDone(false)
      }}
    >
      <DialogContent className="dark max-w-md gap-0 overflow-hidden border-white/10 bg-background p-0 text-foreground">
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <DialogTitle className="text-base">
            {mode === 'signUp' ? 'Keep your work' : 'Sign in to keep your work'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode === 'signUp'
              ? 'Exporting needs an account. Make one and this canvas comes with you.'
              : 'Sign in and this canvas moves to your account.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3 px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Field
            id="try-email"
            label="Email"
            icon={<Mail className="size-4" />}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Field
            id="try-password"
            label="Password"
            icon={<Lock className="size-4" />}
            type="password"
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <p role="alert" className="text-xs text-red-300">
              {error}
            </p>
          )}
          <Button type="submit" className="mt-1 rounded-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === 'signUp' ? 'Create account' : 'Sign in'}
          </Button>
          <button
            type="button"
            className="self-center text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              setMode((current) => (current === 'signUp' ? 'signIn' : 'signUp'))
              setError(null)
            }}
          >
            {mode === 'signUp' ? 'Already have an account? Sign in instead' : 'New here? Create an account'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
