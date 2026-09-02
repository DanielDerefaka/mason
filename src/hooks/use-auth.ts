'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import { toast } from 'sonner'

export const useAuthentication = () => {
  const { signIn, signOut } = useAuthActions()
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleSignIn = async (data: { email: string; password: string }) => {
    setPending(true)
    try {
      await signIn('password', { ...data, flow: 'signIn' })
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
      const backendDown =
        /exceeded the free plan|deployments have been disabled|server error|failed to fetch|network/i.test(
          message,
        )

      if (backendDown) {
        toast.error('Signing in is unavailable right now', {
          description:
            'The backend rejected the request rather than your details, so your password is probably fine. Check the Convex deployment status.',
        })
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
    /**
     * The backend's rule, enforced here because its rejection is unreadable
     * from the client: Convex redacts uncaught errors in production, so a
     * too-short password comes back as a generic server error. The toast used
     * to blame the email for it — someone tried three addresses before the
     * real answer showed up in the deployment logs.
     */
    if (data.password.length < 8) {
      toast.error('Passwords need at least 8 characters.')
      return
    }

    setPending(true)
    try {
      await signIn('password', { ...data, flow: 'signUp' })
      router.push('/dashboard')
    } catch {
      // With length checked above, the usual remaining cause is an address
      // that already has an account.
      toast.error('Could not create that account', {
        description: 'If you already have an account with this email, sign in instead.',
      })
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
