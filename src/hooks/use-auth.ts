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

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/sign-in')
  }

  return { handleSignIn, handleSignUp, handleSignOut, pending }
}
