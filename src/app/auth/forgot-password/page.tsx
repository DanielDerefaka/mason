'use client'

import Link from 'next/link'
import { useState } from 'react'
import { KeyRound, Lock, Mail } from 'lucide-react'

import { AuthShell, Field } from '@/components/auth/AuthShell'
import { useAuthentication } from '@/hooks/use-auth'

/**
 * Forgotten password, in one page and two steps.
 *
 * The code and the new password are asked for on the same screen the email
 * was entered on, rather than behind a link — the person is already here, and
 * a link has to survive being opened in a different browser from the one that
 * asked for it.
 */
export default function ForgotPasswordPage() {
  const { requestReset, confirmReset, pending } = useAuthentication()
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!sent) {
      const ok = await requestReset(email)
      if (ok) setSent(true)
      return
    }
    await confirmReset({ email, code, password })
  }

  return (
    <AuthShell
      title={sent ? 'Enter your code' : 'Reset your password'}
      subtitle={
        sent
          ? `We sent a code to ${email}. It expires in ten minutes.`
          : 'We will email you a code to set a new one.'
      }
      back={{ href: '/auth/sign-in', label: 'Back to sign in' }}
      footer={
        <>
          {sent && (
            <button
              type="button"
              onClick={() => void requestReset(email)}
              disabled={pending}
              className="text-[#d9dcd8]/80 transition-colors hover:text-[#d9dcd8] disabled:opacity-50"
            >
              Send another code
            </button>
          )}
          <span>
            Remembered it?{' '}
            <Link href="/auth/sign-in" className="text-[#d9dcd8]/80 hover:text-[#d9dcd8]">
              Sign in
            </Link>
          </span>
        </>
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
            readOnly={sent}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            icon={<Mail className="h-[18px] w-[18px]" />}
          />

          {sent && (
            <>
              <Field
                id="code"
                name="code"
                label="Code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                icon={<KeyRound className="h-[18px] w-[18px]" />}
              />

              <Field
                id="pwd"
                name="pwd"
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                icon={<Lock className="h-[18px] w-[18px]" />}
              />
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mx-auto mt-8 block w-full rounded-full bg-[#d9dcd8] px-5 py-4 text-[15px] font-semibold text-[#222222] transition-opacity hover:opacity-90 disabled:opacity-40 sm:max-w-[340px]"
        >
          {pending ? 'Working…' : sent ? 'Set new password' : 'Send me a code'}
        </button>
      </form>
    </AuthShell>
  )
}
