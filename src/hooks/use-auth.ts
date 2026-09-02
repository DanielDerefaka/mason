'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvex, type ConvexReactClient } from 'convex/react'
import { toast } from 'sonner'

import { identify, track } from '@/lib/analytics'
import { api } from '../../convex/_generated/api'

/**
 * Messages that mean the backend, not the person, refused.
 *
 * The first two are what a Convex deployment says when it has been disabled
 * for exceeding its plan; the last two are the browser's own words for a
 * request that never arrived.
 */
const BACKEND_DOWN = /exceeded the free plan|deployments have been disabled|failed to fetch|network/i

/**
 * Convex's redaction of a plain `Error` in production: "[Request ID: …]
 * Server Error". The class behind it is unknowable from here.
 */
const MASKED = /server error/i

const BACKEND_DOWN_COPY =
  'The server rejected the request rather than your details. Your password is probably fine, try again in a moment.'

/** What a failed sign-up can be told apart as, from the browser. */
type SignUpFailure = 'backend_down' | 'account_exists' | 'unknown'

/**
 * "Already exists" is readable on a dev deployment and masked in production,
 * where it is still the likeliest cause once the password length has been
 * checked here. `unknown` covers the mask and says so, rather than telling
 * somebody whose backend is down that they have an account.
 */
const classifySignUpFailure = (error: unknown): SignUpFailure => {
  const message = error instanceof Error ? error.message : ''
  if (BACKEND_DOWN.test(message)) return 'backend_down'
  if (/already exists/i.test(message)) return 'account_exists'
  return 'unknown'
}

const SIGN_UP_FAILURE_COPY: Record<SignUpFailure, string> = {
  backend_down: BACKEND_DOWN_COPY,
  account_exists: 'This email already has an account. Sign in instead.',
  unknown:
    'If this email already has an account, sign in instead. If not, the server refused without saying why, so try again in a moment.',
}

/**
 * Ties this browser's anonymous analytics identity to the account it just
 * became, so a guest and the account they convert into are one person in the
 * data rather than two.
 *
 * The library warns of a delay between `signIn` resolving and the client's
 * handshake with the new token, so the first read of the user can come back
 * null; a few short retries cover it, and giving up is silent because
 * analytics must never hold up a sign-in. The Convex client lives in the root
 * layout, so the retries outlive the push to /dashboard.
 */
const IDENTIFY_RETRY_MS = 300
const IDENTIFY_RETRIES = 10

const identifyAfterSignIn = async (convex: ConvexReactClient) => {
  for (let attempt = 0; attempt < IDENTIFY_RETRIES; attempt += 1) {
    const user = await convex.query(api.user.getCurrentUser, {}).catch(() => null)
    if (user) {
      identify(user._id)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, IDENTIFY_RETRY_MS))
  }
}

export const useAuthentication = () => {
  const { signIn, signOut } = useAuthActions()
  const convex = useConvex()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleSignIn = async (data: { email: string; password: string }) => {
    setPending(true)
    try {
      await signIn('password', { ...data, flow: 'signIn' })
      void identifyAfterSignIn(convex)
      router.push('/dashboard')
    } catch (error) {
      /**
       * A failure to sign in is not proof of a wrong password.
       *
       * This reported every failure as bad credentials, and when the backend
       * was disabled for exceeding its plan limits it sent someone hunting for
       * a password that was correct all along. The account was there, the
       * hash was there, and the app said they did not match.
       *
       * Convex Auth deliberately will not say which half of a real credential
       * was wrong — that part stays vague on purpose. But a backend that is
       * down, over quota or unreachable is a different answer, and saying so
       * is the difference between waiting and resetting a password that was
       * never the problem.
       */
      const message = error instanceof Error ? error.message : ''
      const backendDown = BACKEND_DOWN.test(message) || MASKED.test(message)

      if (backendDown) {
        toast.error('Signing in is unavailable right now', { description: BACKEND_DOWN_COPY })
      } else {
        toast.error('Those credentials did not match an account.')
      }
    } finally {
      setPending(false)
    }
  }

  const handleSignUp = async (data: {
    email: string
    password: string
    firstname: string
    lastname: string
    username: string
  }) => {
    track('signup_submitted')
    /**
     * The backend's rule, enforced here because its rejection is unreadable
     * from the client: Convex redacts uncaught errors in production, so a
     * too-short password comes back as a generic server error. The toast used
     * to blame the email for it — someone tried three addresses before the
     * real answer showed up in the deployment logs.
     */
    if (data.password.length < 8) {
      track('signup_failed', { reason: 'short_password' })
      toast.error('Passwords need at least 8 characters.')
      return
    }

    setPending(true)
    try {
      await signIn('password', { ...data, flow: 'signUp' })
      void identifyAfterSignIn(convex)
      router.push('/dashboard')
    } catch (error) {
      const reason = classifySignUpFailure(error)
      track('signup_failed', { reason })
      toast.error('Could not create that account', { description: SIGN_UP_FAILURE_COPY[reason] })
    } finally {
      setPending(false)
    }
  }

  /**
   * Password reset, in two steps.
   *
   * Convex Auth's Password provider models this as two sign-in calls on the
   * same flow: the first sends a code, the second exchanges the code and a
   * new password for a session. There is no separate endpoint, and no
   * intermediate token for the caller to hold.
   */
  const requestReset = async (email: string) => {
    setPending(true)
    try {
      await signIn('password', { email, flow: 'reset' })
      toast.success('Check your email for a code')
      return true
    } catch {
      // Deliberately the same message whether or not the address exists —
      // otherwise this becomes a way to test which emails have accounts.
      toast.success('If that address has an account, a code is on its way')
      return true
    } finally {
      setPending(false)
    }
  }

  const confirmReset = async (data: { email: string; code: string; password: string }) => {
    setPending(true)
    try {
      await signIn('password', {
        email: data.email,
        code: data.code,
        newPassword: data.password,
        flow: 'reset-verification',
      })
      toast.success('Password changed')
      router.push('/dashboard')
      return true
    } catch {
      toast.error('That code was wrong or has expired')
      return false
    } finally {
      setPending(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/sign-in')
  }

  return { handleSignIn, handleSignUp, handleSignOut, requestReset, confirmReset, pending }
}
