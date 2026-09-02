'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AtSign, Lock, Mail, User } from 'lucide-react'

import { AuthShell, Field } from '@/components/auth/AuthShell'
import { useAuthentication } from '@/hooks/use-auth'
import { track } from '@/lib/analytics'

export default function SignUpPage() {
  const { handleSignUp, pending } = useAuthentication()
  // Carried over from the landing page's email field, so the address is typed once.
  const presetEmail = useSearchParams().get('email') ?? ''

  // The top of the sign-up funnel; `signup_submitted` is the next step down.
  useEffect(() => track('signup_viewed'), [])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await handleSignUp({
      email: String(form.get('email') ?? ''),
      password: String(form.get('pwd') ?? ''),
      firstname: String(form.get('firstname') ?? ''),
      lastname: String(form.get('lastname') ?? ''),
      username: String(form.get('username') ?? ''),
    })
  }

  return (
    <AuthShell
      title="Open your canvas"
      subtitle="Create an account to start from your first sketch."
      footer={
        <span>
          Have an account?{' '}
          <Link href="/auth/sign-in" className="text-[#d9dcd8]/80 hover:text-[#d9dcd8]">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="firstname"
              name="firstname"
              label="First name"
              type="text"
              autoComplete="given-name"
              required
              icon={<User className="h-[18px] w-[18px]" />}
            />
            <Field
              id="lastname"
              name="lastname"
              label="Last name"
              type="text"
              autoComplete="family-name"
              required
              icon={<User className="h-[18px] w-[18px]" />}
            />
          </div>

          <Field
            id="email"
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            defaultValue={presetEmail}
            icon={<Mail className="h-[18px] w-[18px]" />}
          />

          <Field
            id="username"
            name="username"
            label="Username"
            type="text"
            autoComplete="username"
            required
            icon={<AtSign className="h-[18px] w-[18px]" />}
          />

          <div>
            {/* minLength matches the backend's rule, so the browser refuses
                the form before Convex would — the server's rejection is
                redacted to a generic error the client cannot explain. */}
            <Field
              id="pwd"
              name="pwd"
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              icon={<Lock className="h-[18px] w-[18px]" />}
            />
            <p className="mt-1.5 text-left text-[12px] text-[#919191]">At least 8 characters.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mx-auto mt-8 block w-full rounded-full bg-[#d9dcd8] px-5 py-4 text-[15px] font-semibold text-[#222222] transition-opacity hover:opacity-90 disabled:opacity-40 sm:max-w-[340px]"
        >
          {pending ? 'Creating account…' : 'Continue'}
        </button>
      </form>
    </AuthShell>
  )
}
