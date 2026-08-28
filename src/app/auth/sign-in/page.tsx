'use client'

import Link from 'next/link'
import { Lock, Mail } from 'lucide-react'

import { AuthShell, Field } from '@/components/auth/AuthShell'
import { useAuthentication } from '@/hooks/use-auth'

export default function SignInPage() {
  const { handleSignIn, pending } = useAuthentication()

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await handleSignIn({
      email: String(form.get('email') ?? ''),
      password: String(form.get('pwd') ?? ''),
    })
  }

  return (
    <AuthShell
      title="Back to the canvas"
      subtitle="Sign in to pick up where you left off."
      footer={
        <span>
          New here?{' '}
          <Link href="/auth/sign-up" className="text-[#d9dcd8]/80 hover:text-[#d9dcd8]">
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit}>
        <div className="space-y-3">
          <Field
            id="email"
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            icon={<Mail className="h-[18px] w-[18px]" />}
          />

          <div>
            <Field
              id="pwd"
              name="pwd"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              icon={<Lock className="h-[18px] w-[18px]" />}
            />
            <div className="mt-1.5 text-right">
              <Link
                href="/auth/forgot-password"
                className="text-[12px] text-[#919191] transition-colors hover:text-[#d9dcd8]"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mx-auto mt-8 block w-full rounded-full bg-[#d9dcd8] px-5 py-4 text-[15px] font-semibold text-[#222222] transition-opacity hover:opacity-90 disabled:opacity-40 sm:max-w-[340px]"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
