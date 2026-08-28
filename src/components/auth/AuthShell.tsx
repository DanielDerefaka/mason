import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { LogoMark } from '@/components/logo-mark'

/**
 * The frame every auth screen sits in: one centred column over the animated
 * background, with the page supplying only its words and its form.
 *
 * A server component on purpose — it holds no state, so the pages that need
 * hooks stay the only client boundary.
 */
export function AuthShell({
  title,
  subtitle,
  back,
  children,
  footer,
}: {
  title: string
  subtitle: string
  /** Renders the top-left arrow link when given. */
  back?: { href: string; label: string }
  /** The form. */
  children: React.ReactNode
  /** Small links under the form. */
  footer?: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 font-sans text-[#d9dcd8]">
      {/* Defined in globals.css — the grainy drifting gradient behind the column. */}
      <div aria-hidden className="auth-silk" />

      {back && (
        <Link
          href={back.href}
          aria-label={back.label}
          className="absolute left-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full text-[#919191] transition-colors hover:bg-white/[0.06] hover:text-[#d9dcd8]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}

      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center text-center">
        <Link href="/" aria-label="Mason home">
          <LogoMark className="h-7 w-7 text-[#d9dcd8]" />
        </Link>
        <h1 className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.025em]">{title}</h1>
        <p className="mt-2 text-[15px] text-[#919191]">{subtitle}</p>

        <div className="mt-8 w-full">{children}</div>

        {footer && (
          <div className="mt-4 flex flex-col items-center gap-2 text-xs font-medium text-[#919191]/70">
            {footer}
          </div>
        )}

        {/* Plain text until /terms and /privacy exist — a link to a 404 is worse than none. */}
        <p className="mt-10 text-[12px] text-[#6f6f6f]">
          By continuing you agree to Mason&apos;s terms and privacy policy.
        </p>
      </div>
    </div>
  )
}

/**
 * A labelled input with an icon sitting in its left padding. Everything the
 * page passes beyond `label` and `icon` lands on the input itself, so the
 * pages keep their `name`, `autoComplete` and validation attributes verbatim.
 */
export function Field({
  id,
  label,
  icon,
  ...input
}: {
  id: string
  label: string
  icon: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="text-left">
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-[#919191]">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#919191]">
          {icon}
        </span>
        <input
          id={id}
          className="w-full rounded-2xl border-2 border-white/[0.08] bg-[#2a2a2a]/70 py-3.5 pl-11 pr-4 text-[15px] text-[#d9dcd8] outline-none transition-colors placeholder:text-[#919191]/60 focus:border-white/[0.28] read-only:opacity-60"
          {...input}
        />
      </div>
    </div>
  )
}
