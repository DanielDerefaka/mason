'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuthentication } from '@/hooks/use-auth'

export default function SignUpPage() {
  const { handleSignUp, pending } = useAuthentication()
  // Carried over from the landing page's email field, so the address is typed once.
  const presetEmail = useSearchParams().get('email') ?? ''

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
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <form onSubmit={onSubmit} className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+0.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]">
        <div className="p-8 pb-6">
          <div>
            <h1 className="mb-1 mt-4 text-xl font-semibold">Create your account</h1>
            <p className="text-sm">Welcome! Create an account to get started</p>
          </div>

          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstname" className="block text-sm">
                  Firstname
                </Label>
                <Input type="text" required name="firstname" id="firstname" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname" className="block text-sm">
                  Lastname
                </Label>
                <Input type="text" required name="lastname" id="lastname" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="block text-sm">
                Email
              </Label>
              <Input type="email" required name="email" id="email" defaultValue={presetEmail} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="block text-sm">
                Username
              </Label>
              <Input type="text" required name="username" id="username" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pwd" className="text-title text-sm">
                Password
              </Label>
              <Input type="password" required name="pwd" id="pwd" className="input sz-md variant-mixed" />
            </div>

            <Button className="w-full" disabled={pending}>
              {pending ? 'Creating account…' : 'Continue'}
            </Button>
          </div>
        </div>

        <div className="bg-muted rounded-(--radius) border p-3">
          <p className="text-accent-foreground text-center text-sm">
            Have an account ?
            <Button asChild variant="link" className="px-2">
              <Link href="/auth/sign-in">Sign In</Link>
            </Button>
          </p>
        </div>
      </form>
    </section>
  )
}
