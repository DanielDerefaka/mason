'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <form
        onSubmit={onSubmit}
        className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+0.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]"
      >
        <div className="p-8 pb-6">
          <div>
            <h1 className="mt-4 mb-1 text-xl font-semibold">
              {sent ? 'Enter your code' : 'Reset your password'}
            </h1>
            <p className="text-sm">
              {sent
                ? `We sent a code to ${email}. It expires in ten minutes.`
                : 'We will email you a code to set a new one.'}
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="block text-sm">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                readOnly={sent}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            {sent && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="code" className="block text-sm">
                    Code
                  </Label>
                  <Input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pwd" className="block text-sm">
                    New password
                  </Label>
                  <Input
                    id="pwd"
                    name="pwd"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Working…' : sent ? 'Set new password' : 'Send me a code'}
            </Button>

            {sent && (
              <button
                type="button"
                onClick={() => void requestReset(email)}
                disabled={pending}
                className="text-muted-foreground hover:text-foreground w-full text-center text-xs transition-colors"
              >
                Send another code
              </button>
            )}
          </div>
        </div>

        <div className="bg-muted rounded-(--radius) border p-3">
          <p className="text-accent-foreground text-center text-sm">
            Remembered it ?
            <Button asChild variant="link" className="px-2">
              <Link href="/auth/sign-in">Sign In</Link>
            </Button>
          </p>
        </div>
      </form>
    </section>
  )
}
