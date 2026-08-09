'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

/**
 * Hands the address straight to sign-up rather than collecting it here.
 *
 * A landing page that swallows an email and shows a thank-you is a second
 * database and a second flow to maintain; carrying it into the form the user
 * was going to fill in anyway costs nothing and skips a step for them.
 */
export const WaitlistForm = () => {
  const router = useRouter()
  const [email, setEmail] = useState('')

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const trimmed = email.trim()
        router.push(trimmed ? `/auth/sign-up?email=${encodeURIComponent(trimmed)}` : '/auth/sign-up')
      }}
      className="mx-auto flex w-full max-w-md items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] p-1.5 backdrop-blur"
    >
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your email"
        aria-label="Email address"
        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-4 py-2 text-sm outline-none"
      />
      <button
        type="submit"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
      >
        Start free
        <ArrowRight className="size-3.5" />
      </button>
    </form>
  )
}
