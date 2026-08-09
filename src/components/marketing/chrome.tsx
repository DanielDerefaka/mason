import Link from 'next/link'

/** The app mark, same construction as the dashboard navbar's. */
export const Mark = ({ className = 'size-7' }: { className?: string }) => (
  <span className={`grid ${className} shrink-0 place-items-center rounded-full ring-[3px] ring-white`}>
    <span className="size-3 rounded-full bg-white" />
  </span>
)

const NAV = [
  { href: '/#how', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/blog', label: 'Blog' },
  { href: '/#pricing', label: 'Pricing' },
]

export const MarketingNav = () => (
  <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/60 backdrop-blur">
    <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
      <Link href="/" className="flex items-center gap-2.5">
        <Mark />
        <span className="text-sm font-medium tracking-tight">Sketch to Design</span>
      </Link>

      <nav className="hidden flex-1 items-center gap-1 md:flex">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-xs transition-colors hover:bg-white/[0.05]"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <Link
          href="/auth/sign-in"
          className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-xs transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90"
        >
          Start free
        </Link>
      </div>
    </div>
  </header>
)

export const MarketingFooter = () => (
  <footer className="border-t border-white/[0.06] px-6 py-12">
    <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
      <div className="max-w-xs space-y-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark className="size-6" />
          <span className="text-sm font-medium tracking-tight">Sketch to Design</span>
        </Link>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Draw the shape of a screen. Get a design system, a finished interface, and the flow
          around it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-10 text-xs sm:grid-cols-3">
        <div className="space-y-2.5">
          <p className="text-muted-foreground">Product</p>
          <Link href="/#how" className="block hover:underline">How it works</Link>
          <Link href="/#features" className="block hover:underline">Features</Link>
          <Link href="/#pricing" className="block hover:underline">Pricing</Link>
        </div>
        <div className="space-y-2.5">
          <p className="text-muted-foreground">Resources</p>
          <Link href="/blog" className="block hover:underline">Blog</Link>
          <Link href="/#faq" className="block hover:underline">FAQ</Link>
        </div>
        <div className="space-y-2.5">
          <p className="text-muted-foreground">Account</p>
          <Link href="/auth/sign-in" className="block hover:underline">Sign in</Link>
          <Link href="/auth/sign-up" className="block hover:underline">Create account</Link>
        </div>
      </div>
    </div>

    <div className="text-muted-foreground mx-auto mt-10 max-w-6xl text-[11px]">
      © {new Date().getFullYear()} Sketch to Design.
    </div>
  </footer>
)
