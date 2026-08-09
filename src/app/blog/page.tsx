import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MarketingFooter, MarketingNav } from '@/components/marketing/chrome'
import { POSTS, formatDate } from '@/content/posts'

export const metadata = {
  title: 'Blog — Sketch to Design',
  description: 'Notes on generating interfaces: sketches, design systems, streaming and flows.',
}

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-black text-foreground">
      <MarketingNav />

      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back home
        </Link>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Blog</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          What we have learned building a tool that turns rectangles into interfaces.
        </p>

        <div className="mt-12 divide-y divide-white/[0.06]">
          {POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group block py-7 first:pt-0">
              <span className="text-muted-foreground text-[11px]">
                {post.tag} · {formatDate(post.date)} · {post.readingMinutes} min read
              </span>
              <h2 className="mt-2 text-xl font-medium tracking-tight group-hover:underline">
                {post.title}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
