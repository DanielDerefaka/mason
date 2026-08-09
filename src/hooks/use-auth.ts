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
    } catch {
      // Convex Auth deliberately does not say which half was wrong.
      toast.error('Those credentials did not match an account.')
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
    setPending(true)
    try {
      await signIn('password', { ...data, flow: 'signUp' })
      router.push('/dashboard')
    } catch {
      toast.error('Could not create that account. Try a different email.')
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
