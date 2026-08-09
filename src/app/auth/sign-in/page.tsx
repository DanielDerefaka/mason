'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
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
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <form onSubmit={onSubmit} className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+0.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]">
        <div className="p-8 pb-6">
          <div>
            <h1 className="mb-1 mt-4 text-xl font-semibold">Sign in</h1>
            <p className="text-sm">Welcome back! Sign in to continue</p>
          </div>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="block text-sm">
                Email
              </Label>
              <Input type="email" required name="email" id="email" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pwd" className="text-title text-sm">
                  Password
                </Label>
                <Button asChild variant="link" size="sm">
                  <Link href="#" className="link intent-info variant-ghost text-sm">
                    Forgot your Password ?
                  </Link>
                </Button>
              </div>
              <Input type="password" required name="pwd" id="pwd" className="input sz-md variant-mixed" />
            </div>

            <Button className="w-full" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign In'}
            </Button>
          </div>
        </div>

        <div className="bg-muted rounded-(--radius) border p-3">
          <p className="text-accent-foreground text-center text-sm">
            Don&apos;t have an account ?
            <Button asChild variant="link" className="px-2">
              <Link href="/auth/sign-up">Create account</Link>
            </Button>
          </p>
        </div>
      </form>
    </section>
  )
}
